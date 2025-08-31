"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Crown, Rocket } from "lucide-react";

const pricingTiers = [
  {
    title: "Free",
    monthlyPrice: 0,
    buttonText: "Commencer gratuitement",
    popular: false,
    inverse: false,
    icon: <Zap className="h-6 w-6" />,
    features: [
      "3 générations de plans par mois",
      "1 identité visuelle par mois", 
      "5 uploads média par mois",
      "1 projet",
      "Support communautaire",
      "Accès aux templates de base",
    ],
  },
  {
    title: "Pro",
    monthlyPrice: 19,
    buttonText: "Démarrer l'essai gratuit",
    popular: true,
    inverse: true,
    icon: <Crown className="h-6 w-6" />,
    features: [
      "Générations de plans illimitées",
      "Identités visuelles illimitées",
      "50 uploads média par mois", 
      "10 projets",
      "Collaboration en équipe",
      "Support prioritaire",
      "Export de code avancé",
      "Intégrations API",
      "Templates premium",
    ],
  },
  {
    title: "Enterprise",
    monthlyPrice: 99,
    buttonText: "Contacter l'équipe",
    popular: false,
    inverse: false,
    icon: <Rocket className="h-6 w-6" />,
    features: [
      "Tout du plan Pro",
      "Projets illimités",
      "Uploads média illimités",
      "Branding personnalisé",
      "Manager de support dédié",
      "Accès API complet",
      "Sécurité niveau entreprise",
      "Formation personnalisée",
      "SLA garantie",
    ],
  },
];

interface PricingProps {
  onSelectPlan?: (planTitle: string, price: number) => void;
}

export default function Pricing_05({ onSelectPlan }: PricingProps) {
  return (
    <section className="py-24 bg-white dark:bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Tarifs simples pour chaque équipe
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Que vous commenciez petit ou que vous évoluiez rapidement, notre plateforme grandit avec vos besoins de création.
          </p>
        </div>

        <div className="flex flex-col gap-6 items-center mt-12 lg:flex-row lg:items-end lg:justify-center">
          {pricingTiers.map(({ title, monthlyPrice, buttonText, popular, features, inverse, icon }) => (
            <Card
              key={title}
              className={`max-w-xs w-full border-2 transition-all duration-300 hover:scale-105 ${
                inverse 
                  ? "bg-gradient-to-br from-gray-900 to-black text-white border-gray-700" 
                  : popular 
                    ? "border-primary shadow-lg"
                    : "hover:border-primary/50"
              }`}
            >
              <CardHeader className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${inverse ? "bg-white/10" : "bg-primary/10"}`}>
                    {icon}
                  </div>
                  <CardTitle className={`text-lg font-bold ${inverse ? "text-white" : "text-foreground"}`}>
                    {title}
                  </CardTitle>
                </div>
                {popular && (
                  <motion.div
                    animate={{ backgroundPositionX: "-100%" }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                      repeatType: "loop",
                    }}
                    className="text-sm px-3 py-1 rounded-xl border border-white/20 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-[length:200%_100%] text-transparent bg-clip-text font-medium"
                  >
                    Populaire
                  </motion.div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold tracking-tighter leading-none">
                    {monthlyPrice === 0 ? "Gratuit" : `${monthlyPrice}€`}
                  </span>
                  {monthlyPrice > 0 && (
                    <span className={`tracking-tight font-semibold ${inverse ? "text-white/60" : "text-muted-foreground"}`}>
                      /mois
                    </span>
                  )}
                </div>
                <Button
                  variant={inverse ? "secondary" : popular ? "default" : "outline"}
                  className="w-full mt-6"
                  onClick={() => onSelectPlan?.(title, monthlyPrice)}
                >
                  {buttonText}
                </Button>
                <ul className="flex flex-col gap-4 mt-6 text-sm">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        inverse ? "text-green-400" : "text-green-600"
                      }`} />
                      <span className={inverse ? "text-white/90" : "text-foreground"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Tous les plans incluent un essai gratuit de 14 jours. Aucune carte de crédit requise.
          </p>
        </div>
      </div>
    </section>
  );
}