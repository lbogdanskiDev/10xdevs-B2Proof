/**
 * Brief detail components
 * Components for displaying and managing a single brief detail view
 */

// Main detail components
export { BriefHeader } from "./BriefHeader";

export { BriefContentSection } from "./BriefContentSection";

export { BriefContentRenderer } from "./BriefContentRenderer";

export { BriefFooterSection } from "./BriefFooterSection";

export { BriefActionButtons } from "./BriefActionButtons";

// Action components
export { OwnerActions } from "./OwnerActions";

export { RecipientActions } from "./RecipientActions";

// Dialog components
export { DeleteBriefDialog } from "./DeleteBriefDialog";

export { NeedsModificationDialog } from "./NeedsModificationDialog";

export { ShareBriefDialog } from "./ShareBriefDialog";

// Re-export submodules
export * from "./comments";
export * from "./recipients";
