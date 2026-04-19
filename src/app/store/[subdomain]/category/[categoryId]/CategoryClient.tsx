import { StorefrontProductGrid } from "../../components/StorefrontProductGrid";

export default function CategoryClient({ subdomain, categoryId }: { subdomain: string; categoryId: string }) {
  return <StorefrontProductGrid categoryId={categoryId} />;
}
