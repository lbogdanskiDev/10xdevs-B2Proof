import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { EditBriefClient } from "@/components/briefs/form";
import type { BriefDetailDto } from "@/types";

interface EditBriefPageProps {
  params: Promise<{ id: string }>;
}

async function getBriefForEdit(id: string): Promise<BriefDetailDto | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (response.status === 403) {
    redirect(`/briefs/${id}?error=not-owner`);
  }

  if (!response.ok) {
    throw new Error("Failed to fetch brief for editing");
  }

  const brief: BriefDetailDto = await response.json();

  // Only the owner can edit the brief
  if (!brief.isOwned) {
    redirect(`/briefs/${id}?error=not-owner`);
  }

  return brief;
}

export default async function EditBriefPage({ params }: EditBriefPageProps) {
  const { id } = await params;

  const brief = await getBriefForEdit(id);

  if (!brief) {
    notFound();
  }

  return <EditBriefClient brief={brief} />;
}

export async function generateMetadata({ params }: EditBriefPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}`, {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        title: "Edit Brief | B2Proof",
      };
    }

    const brief: BriefDetailDto = await response.json();

    return {
      title: `Edit: ${brief.header} | B2Proof`,
      description: `Edit brief: ${brief.header}`,
    };
  } catch {
    return {
      title: "Edit Brief | B2Proof",
    };
  }
}
