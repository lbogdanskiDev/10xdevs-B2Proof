-- Migration: 000_extensions.sql
-- Description: Enable required PostgreSQL extensions
-- Date: 2025-01-15
-- Author: System

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Automatic timestamp update function
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA extensions;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- Note: Extensions are typically not dropped as they may be used by other schemas
-- If rollback is absolutely necessary:
-- DROP EXTENSION IF EXISTS "moddatetime";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
