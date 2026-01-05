# Plan konsolidacji migracji bazy danych

## Cel

Przepisanie 12 plików migracji do 7 skonsolidowanych plików z poprawkami, optymalizacjami i spójnym nazewnictwem.

---

## Obecny stan

### Pliki migracji (12 plików, ~76 KB)

| Plik                                                  | Opis                    | Problem                                  |
| ----------------------------------------------------- | ----------------------- | ---------------------------------------- |
| `000_extensions.sql`                                  | Rozszerzenia PostgreSQL | Niespójne nazewnictwo                    |
| `001_create_enums.sql`                                | Typy ENUM               | Niespójne nazewnictwo                    |
| `002_create_tables.sql`                               | Tabele                  | Brak `recipient_email`                   |
| `003_create_indexes.sql`                              | Indeksy                 | OK                                       |
| `004_create_functions.sql`                            | Funkcje                 | Stara wersja `user_has_brief_access`     |
| `005_create_triggers.sql`                             | Triggery                | Brak `auto_update_recipient_id`          |
| `006_create_rls_policies.sql`                         | Polityki RLS            | Brak optymalizacji `(SELECT auth.uid())` |
| `007_seed_data.sql`                                   | Dane testowe            | OK (do zachowania)                       |
| `008_add_recipient_email.sql`                         | Dodanie recipient_email | Poprawka do 002                          |
| `20251220141332_add_recipient_update_policy.sql`      | Polityka UPDATE         | Poprawka do 006                          |
| `20251220170000_fix_recipient_policy_performance.sql` | Fix wydajności          | Poprawka do poprawki                     |
| `20251220190000_fix_recipient_select_policy.sql`      | Fix SELECT policy       | Poprawka do poprawki                     |

### Zidentyfikowane problemy

1. **Niespójne nazewnictwo** - mix prefix numeryczny i timestamp UTC
2. **Rozproszone zmiany** - 4 pliki dotyczące `recipient_email`
3. **Duplikacja funkcji** - `user_has_brief_access` definiowana 3 razy
4. **Brak optymalizacji RLS** - `auth.uid()` bez `(SELECT ...)`
5. **Brakująca polityka** - `briefs_update_status_by_client` dla klientów
6. **Redundancja** - `get_current_user_email` vs `get_user_by_email`

---

## Nowa struktura (7 plików, ~50 KB)

### 1. `20251220200000_extensions.sql`

Zawartość bez zmian - rozszerzenia PostgreSQL:

- `uuid-ossp`
- `moddatetime`

### 2. `20251220200001_create_enums.sql`

Zawartość bez zmian - typy ENUM:

- `user_role` (creator, client)
- `brief_status` (draft, sent, accepted, rejected, needs_modification)
- `audit_action` (user_registered, user_deleted, brief_created, ...)

### 3. `20251220200002_create_tables.sql`

Tabele z **recipient_email wbudowanym od początku**:

```sql
-- profiles (bez zmian)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- briefs (bez zmian)
CREATE TABLE briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  header TEXT NOT NULL,
  content JSONB NOT NULL,
  footer TEXT,
  status brief_status NOT NULL DEFAULT 'draft',
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT header_length_check CHECK (char_length(header) > 0 AND char_length(header) <= 200),
  CONSTRAINT footer_length_check CHECK (footer IS NULL OR char_length(footer) <= 200),
  CONSTRAINT comment_count_check CHECK (comment_count >= 0)
);

-- brief_recipients (ZMIANA: recipient_email od początku)
CREATE TABLE brief_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULLABLE
  recipient_email TEXT NOT NULL,  -- NOWE: wymagane
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_brief_recipient_email UNIQUE (brief_id, recipient_email),
  CONSTRAINT recipient_email_format_check CHECK (
    recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

-- comments (bez zmian)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT content_length_check CHECK (char_length(content) > 0 AND char_length(content) <= 1000)
);

-- audit_log (bez zmian)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. `20251220200003_create_indexes.sql`

Indeksy z **dodatkowym indeksem na recipient_email**:

```sql
-- briefs
CREATE INDEX idx_briefs_owner_updated ON briefs(owner_id, updated_at DESC);
CREATE INDEX idx_briefs_status_updated ON briefs(status, updated_at DESC);
CREATE INDEX idx_briefs_owner_id ON briefs(owner_id);
CREATE INDEX idx_briefs_status_changed_by ON briefs(status_changed_by);

-- brief_recipients (NOWE: indeks na recipient_email)
CREATE INDEX idx_brief_recipients_recipient_id ON brief_recipients(recipient_id);
CREATE INDEX idx_brief_recipients_brief_id ON brief_recipients(brief_id);
CREATE INDEX idx_brief_recipients_shared_by ON brief_recipients(shared_by);
CREATE INDEX idx_brief_recipients_recipient_email ON brief_recipients(recipient_email);

-- comments
CREATE INDEX idx_comments_brief_created ON comments(brief_id, created_at DESC);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- audit_log
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);
```

### 5. `20251220200004_create_functions.sql`

Funkcje **skonsolidowane i zoptymalizowane**:

```sql
-- get_current_user_email (pomocnicza, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_email() TO authenticated;

-- user_has_brief_access (finalna wersja z recipient_email)
CREATE OR REPLACE FUNCTION user_has_brief_access(brief_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  current_user_id := auth.uid();
  current_user_email := public.get_current_user_email();

  RETURN EXISTS (
    SELECT 1 FROM public.briefs
    WHERE id = brief_id AND owner_id = current_user_id

    UNION

    SELECT 1 FROM public.brief_recipients
    WHERE brief_recipients.brief_id = user_has_brief_access.brief_id
      AND (recipient_id = current_user_id OR recipient_email = current_user_email)
  );
END;
$$;

-- get_user_by_email (lookup dla udostępniania)
CREATE OR REPLACE FUNCTION get_user_by_email(email_param TEXT)
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::TEXT
  FROM auth.users au
  WHERE au.email = email_param;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;

-- Trigger functions (enforce_creator_brief_limit, enforce_recipient_limit, etc.)
-- ... (pozostałe funkcje triggerów bez zmian)

-- auto_update_recipient_id (NOWE: aktualizuje recipient_id gdy user się rejestruje)
CREATE OR REPLACE FUNCTION auto_update_recipient_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.brief_recipients
  SET recipient_id = NEW.id
  WHERE recipient_email = NEW.email
    AND recipient_id IS NULL;
  RETURN NEW;
END;
$$;
```

### 6. `20251220200005_create_triggers.sql`

Triggery z **dodanym auto_update_recipient_id**:

```sql
-- Istniejące triggery (bez zmian)
-- update_profiles_updated_at
-- update_briefs_updated_at
-- enforce_creator_brief_limit_trigger
-- reset_status_on_brief_edit_trigger
-- enforce_recipient_limit_trigger
-- auto_change_status_to_sent_trigger
-- reset_status_on_all_recipients_removed_trigger
-- update_comment_count_on_insert_trigger
-- update_comment_count_on_delete_trigger
-- audit_comment_deletion_trigger
-- archive_before_user_deletion_trigger
-- create_profile_for_new_user_trigger

-- NOWY: Aktualizacja pending invitations po rejestracji użytkownika
CREATE TRIGGER update_pending_recipients_on_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_recipient_id();
```

### 7. `20251220200006_create_rls_policies.sql`

Polityki RLS **zoptymalizowane i kompletne**:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- PROFILES (bez zmian)
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY profiles_delete_own ON profiles FOR DELETE
  USING ((SELECT auth.uid()) = id);

-- BRIEFS (OPTYMALIZACJA: usunięta redundancja w SELECT)
CREATE POLICY briefs_select_accessible ON briefs FOR SELECT
  USING (user_has_brief_access(id));

CREATE POLICY briefs_insert_creators_only ON briefs FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = owner_id AND
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'creator'
  );

CREATE POLICY briefs_update_own ON briefs FOR UPDATE
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- NOWE: Klienci mogą zmieniać status briefu
CREATE POLICY briefs_update_status_by_client ON briefs FOR UPDATE
  USING (
    user_has_brief_access(id) AND
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'client'
  )
  WITH CHECK (
    status IN ('accepted', 'rejected', 'needs_modification') AND
    status_changed_by = (SELECT auth.uid())
  );

CREATE POLICY briefs_delete_own ON briefs FOR DELETE
  USING (owner_id = (SELECT auth.uid()));

-- BRIEF_RECIPIENTS (kompletne polityki)
CREATE POLICY brief_recipients_select_own_briefs ON brief_recipients FOR SELECT
  USING ((SELECT owner_id FROM briefs WHERE id = brief_id) = (SELECT auth.uid()));

CREATE POLICY brief_recipients_select_as_recipient ON brief_recipients FOR SELECT
  USING (
    recipient_id = (SELECT auth.uid()) OR
    recipient_email = get_current_user_email()
  );

CREATE POLICY brief_recipients_insert_own_briefs ON brief_recipients FOR INSERT
  WITH CHECK (
    (SELECT owner_id FROM briefs WHERE id = brief_id) = (SELECT auth.uid()) AND
    shared_by = (SELECT auth.uid())
  );

CREATE POLICY brief_recipients_update_claim_invitation ON brief_recipients FOR UPDATE
  USING (
    recipient_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid())) AND
    recipient_id IS NULL
  )
  WITH CHECK (
    recipient_id = (SELECT auth.uid()) AND
    recipient_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY brief_recipients_delete_own_briefs ON brief_recipients FOR DELETE
  USING ((SELECT owner_id FROM briefs WHERE id = brief_id) = (SELECT auth.uid()));

-- COMMENTS (bez zmian, klienci mogą komentować)
CREATE POLICY comments_select_accessible_briefs ON comments FOR SELECT
  USING (user_has_brief_access(brief_id));

CREATE POLICY comments_insert_accessible_briefs ON comments FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid()) AND
    user_has_brief_access(brief_id)
  );

CREATE POLICY comments_delete_own ON comments FOR DELETE
  USING (author_id = (SELECT auth.uid()));

-- AUDIT_LOG
CREATE POLICY audit_log_select_own ON audit_log FOR SELECT
  USING (user_id = (SELECT auth.uid()));
```

### 8. `20251220200007_seed_data.sql` (opcjonalnie)

Dane testowe - przeniesione z `007_seed_data.sql` bez zmian.

---

## Podsumowanie zmian

### Nowe funkcjonalności

| Funkcjonalność                            | Status                                       |
| ----------------------------------------- | -------------------------------------------- |
| `recipient_email` w `brief_recipients`    | ✅ Wbudowane od początku                     |
| Pending invitations (recipient_id = NULL) | ✅ Wbudowane                                 |
| Auto-claim invitation po rejestracji      | ✅ Trigger `auto_update_recipient_id`        |
| Klienci mogą zmieniać status briefu       | ✅ Polityka `briefs_update_status_by_client` |
| Klienci mogą dodawać komentarze           | ✅ Już działało (bez zmian)                  |

### Optymalizacje

| Optymalizacja                                     | Opis                                              |
| ------------------------------------------------- | ------------------------------------------------- |
| `(SELECT auth.uid())`                             | Wszystkie wywołania auth.uid() opakowane w SELECT |
| Jedna wersja `user_has_brief_access`              | Zamiast 3 definicji                               |
| Usunięta redundancja w `briefs_select_accessible` | Tylko `user_has_brief_access(id)`                 |
| Spójne nazewnictwo                                | Format timestamp UTC                              |

### Redukcja plików

| Metryka                           | Przed  | Po     |
| --------------------------------- | ------ | ------ |
| Liczba plików                     | 12     | 7-8    |
| Rozmiar                           | ~76 KB | ~50 KB |
| Definicje `user_has_brief_access` | 3      | 1      |

---

## Kroki wdrożenia

1. **Backup obecnej bazy** (jeśli są dane produkcyjne)
2. **Reset bazy danych** - `supabase db reset` lub usunięcie tabel
3. **Usunięcie starych migracji** z `supabase/migrations/`
4. **Utworzenie nowych plików migracji** (7-8 plików)
5. **Uruchomienie migracji** - `supabase db push` lub `supabase migration up`
6. **Weryfikacja** - testy RLS, triggery, funkcje
7. **Aktualizacja `database.types.ts`** - `supabase gen types typescript --local`

---

## Checklist przed wdrożeniem

- [ ] Potwierdzenie, że baza może być wyczyszczona
- [ ] Backup danych (jeśli potrzebny)
- [ ] Usunięcie starych plików migracji
- [ ] Utworzenie nowych plików migracji
- [ ] Test migracji na lokalnej bazie
- [ ] Weryfikacja polityk RLS
- [ ] Aktualizacja typów TypeScript
- [ ] Test aplikacji z nową bazą
