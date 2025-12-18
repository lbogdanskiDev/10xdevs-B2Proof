import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  BriefHeader,
  BriefContentSection,
  BriefFooterSection,
  BriefRecipientsSection,
  BriefCommentsSection,
} from "@/components/briefs";
import type { BriefDetailDto, PaginatedResponse, CommentDto, BriefRecipientDto } from "@/types";

interface BriefDetailsPageProps {
  params: Promise<{ id: string }>;
}

async function getBriefDetails(id: string): Promise<BriefDetailDto | null> {
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
    redirect("/briefs?error=no-access");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch brief details");
  }

  return response.json();
}

async function getBriefComments(id: string): Promise<PaginatedResponse<CommentDto>> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}/comments`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  }

  return response.json();
}

async function getBriefRecipients(id: string): Promise<BriefRecipientDto[]> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}/recipients`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

export default async function BriefDetailsPage({ params }: BriefDetailsPageProps) {
  const { id } = await params;

  const brief = await getBriefDetails(id);

  if (!brief) {
    notFound();
  }

  // Fetch additional data in parallel
  const [comments, recipients] = await Promise.all([
    getBriefComments(id),
    brief.isOwned ? getBriefRecipients(id) : Promise.resolve([]),
  ]);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <BriefHeader brief={brief} />

      <BriefContentSection content={brief.content} />

      <BriefFooterSection footer={brief.footer} />

      {brief.isOwned && <BriefRecipientsSection briefId={brief.id} initialRecipients={recipients} />}

      <BriefCommentsSection briefId={brief.id} initialComments={comments} />
    </div>
  );
}

export async function generateMetadata({ params }: BriefDetailsPageProps) {
  const { id } = await params;
  const brief = await getBriefDetails(id);

  if (!brief) {
    return {
      title: "Brief Not Found",
    };
  }

  return {
    title: brief.header,
    description: `Brief details for ${brief.header}`,
  };
}
