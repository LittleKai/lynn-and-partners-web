import { Product } from "@/app/types";
import { useProductStore } from "@/app/useProductStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface ProductsDropDownProps {
  row: {
    original: Product;
  };
}

export default function ProductsDropDown({ row }: ProductsDropDownProps) {
  const {
    addProduct,
    deleteProduct,
    setSelectedProduct,
    setOpenProductDialog,
    loadProducts,
  } = useProductStore();
  const router = useRouter();
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslations("actions");

  const handleCopyProduct = async () => {
    setIsCopying(true);

    try {
      const uniqueSku = `${row.original.sku}-${Date.now()}`;

      const productToCopy: Product = {
        ...row.original,
        id: Date.now().toString(),
        name: `${row.original.name} (copy)`,
        sku: uniqueSku,
        createdAt: new Date(),
        category: row.original.category || "Unknown",
        supplier: row.original.supplier || "Unknown",
      };

      const result = await addProduct(productToCopy);
      if (result.success) {
        toast({
          title: t("copySuccess"),
          description: `"${row.original.name}" ${t("copySuccessDesc")}`,
        });

        await loadProducts();
        router.refresh();
      } else {
        toast({
          title: t("copyFailed"),
          description: t("copyFailedDesc"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("copyFailed"),
        description: t("copyFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleEditProduct = () => {
    try {
      setSelectedProduct(row.original);
      setOpenProductDialog(true);
    } catch (error) {
      console.error("Error opening edit dialog:", error);
    }
  };

  const handleDeleteProduct = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteProduct(row.original.id);
      if (result.success) {
        toast({
          title: t("deleteSuccess"),
          description: `"${row.original.name}" ${t("deleteSuccessDesc")}`,
        });

        router.refresh();
      } else {
        toast({
          title: t("deleteFailed"),
          description: t("deleteFailedDesc"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("deleteFailed"),
        description: t("deleteFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t("openMenu")}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM10 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM10 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyProduct} disabled={isCopying}>
          {isCopying ? t("copying") : t("copy")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEditProduct}>{t("edit")}</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDeleteProduct} disabled={isDeleting}>
          {isDeleting ? t("deleting") : t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
