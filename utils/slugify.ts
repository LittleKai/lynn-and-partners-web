export function buildBranchSlug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${id}`;
}

export function extractBranchId(slug: string): string {
  return slug.match(/[0-9a-f]{24}$/)?.[0] ?? "";
}
