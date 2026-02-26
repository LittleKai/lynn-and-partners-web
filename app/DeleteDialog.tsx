import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProductStore } from "./useProductStore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function DeleteDialog() {
  const {
    openDialog,
    setOpenDialog,
    setSelectedProduct,
    selectedProduct,
    deleteProduct,
  } = useProductStore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslations("deleteDialog");
  const tActions = useTranslations("actions");

  async function deleteProductFx() {
    if (selectedProduct) {
      setIsDeleting(true);

      try {
        const result = await deleteProduct(selectedProduct.id);
        if (result.success) {
          toast({
            title: t("successTitle"),
            description: `"${selectedProduct.name}" ${t("successDesc")}`,
          });

          setOpenDialog(false);
          setSelectedProduct(null);
        } else {
          toast({
            title: t("failTitle"),
            description: t("failDesc"),
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: t("failTitle"),
          description: t("errorDesc"),
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  }

  return (
    <AlertDialog
      open={openDialog}
      onOpenChange={(open) => {
        setOpenDialog(open);
      }}
    >
      <AlertDialogContent className="p-4 sm:p-8">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg sm:text-xl">
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm sm:text-base">
            {t("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4">
          <AlertDialogCancel
            onClick={() => {
              setSelectedProduct(null);
            }}
            className="w-full sm:w-auto"
          >
            {tActions("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteProductFx()}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting ? t("deleting") : tActions("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
