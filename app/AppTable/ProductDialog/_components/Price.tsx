"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MdError } from "react-icons/md";
import { NumericFormat } from "react-number-format";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";

export default function Price() {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const t = useTranslations("product");

  return (
    <div className="flex flex-col gap-2 pt-[6px]">
      <Label htmlFor="price" className="text-slate-600">
        {t("price")}
      </Label>
      <Controller
        name="price"
        control={control}
        defaultValue=""
        render={({ field: { onChange, value, ...field } }) => (
          <NumericFormat
            {...field}
            value={value}
            customInput={Input}
            thousandSeparator
            placeholder="Price..."
            className="h-11"
            decimalScale={2}
            allowNegative={false}
            onValueChange={(values) => {
              const { floatValue, value } = values;
              onChange(value === "" ? "" : floatValue ?? 0);
            }}
          />
        )}
      />

      {errors.price && (
        <div className="text-red-500 flex gap-1 items-center text-[13px]">
          <MdError />
          <p>{String(errors.price.message)}</p>
        </div>
      )}
    </div>
  );
}
