"use client";

import { motion } from "framer-motion";
import { PenLine, Link2, Flame } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: PenLine,
      title: t("how.step1.title"),
      description: t("how.step1.desc"),
    },
    {
      icon: Link2,
      title: t("how.step2.title"),
      description: t("how.step2.desc"),
    },
    {
      icon: Flame,
      title: t("how.step3.title"),
      description: t("how.step3.desc"),
    },
  ];

  return (
    <section className="px-4 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <span className="font-mono-vaultify text-xs uppercase tracking-wider text-accent">
          {t("how.eyebrow")}
        </span>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-3">
          {t("how.title")}
        </h2>
      </motion.div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="glass-panel rounded-2xl p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-mono-vaultify text-xs text-muted-foreground">
                {index + 1}
              </span>
              <h3 className="text-base font-medium text-foreground mt-1 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}