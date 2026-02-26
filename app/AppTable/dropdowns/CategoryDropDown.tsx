"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuGitPullRequestDraft } from "react-icons/lu";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useProductStore } from "@/app/useProductStore";
import { useAuth } from "@/app/authContext";
import { useTranslations } from "next-intl";

type CategoryDropDownProps = {
  selectedCategory: string[];
  setSelectedCategory: React.Dispatch<React.SetStateAction<string[]>>;
};

export function CategoryDropDown({
  selectedCategory,
  setSelectedCategory,
}: CategoryDropDownProps) {
  const [open, setOpen] = React.useState(false);
  const { categories, loadCategories } = useProductStore();
  const { user } = useAuth();
  const t = useTranslations("filters");

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const userCategories = React.useMemo(() => {
    return categories.filter((category) => category.userId === user?.id);
  }, [categories, user]);

  function handleCheckboxChange(value: string) {
    setSelectedCategory((prev) => {
      return prev.includes(value)
        ? prev.filter((category) => category !== value)
        : [...prev, value];
    });
  }

  function clearFilters() {
    setSelectedCategory([]);
  }

  return (
    <div className="flex items-center space-x-4 poppins">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={"secondary"} className="h-10">
            <LuGitPullRequestDraft />
            {t("categories")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-56 poppins" side="bottom" align="end">
          <Command className="p-1">
            <CommandInput placeholder={t("categories")} />
            <CommandList>
              <CommandEmpty className="text-slate-500 text-sm text-center p-5">
                {t("noCategory")}
              </CommandEmpty>
              <CommandGroup>
                {userCategories.map((category) => (
                  <CommandItem className="h-9" key={category.id}>
                    <Checkbox
                      checked={selectedCategory.includes(category.id)}
                      onClick={() => handleCheckboxChange(category.id)}
                      className="size-4 rounded-[4px]"
                    />
                    <div className="flex items-center gap-1 p-1 rounded-lg px-3 text-[14px]">
                      {category.name}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="flex flex-col gap-2 text-[23px]">
              <Separator />
              <Button
                onClick={clearFilters}
                variant={"ghost"}
                className="text-[12px] mb-1"
              >
                {t("clearFilters")}
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
