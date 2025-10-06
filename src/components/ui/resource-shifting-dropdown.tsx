import React, { useEffect, useState } from "react";
import { Component, Image, Type, Palette, Droplet } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BaseResourceItem {
  nom: string;
  [key: string]: any;
}

interface TabConfig {
  id: number;
  title: string;
  icon: React.ElementType;
  Component: React.FC<{ items: any[]; onSelect: (item: any) => void }>;
}

interface ResourceShiftingDropdownProps {
  tabs: TabConfig[];
  className?: string;
}

export const ResourceShiftingDropdown: React.FC<ResourceShiftingDropdownProps> = ({ tabs, className }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [dir, setDir] = useState<"l" | "r" | null>(null);

  const handleSetSelected = (val: number | null) => {
    if (typeof selected === "number" && typeof val === "number") {
      setDir(selected > val ? "r" : "l");
    } else if (val === null) {
      setDir(null);
    }
    setSelected(val);
  };

  return (
    <div
      onMouseLeave={() => handleSetSelected(null)}
      className={cn("relative flex h-fit gap-2", className)}
    >
      {tabs.map((t) => (
        <Tab
          key={t.id}
          selected={selected}
          handleSetSelected={handleSetSelected}
          tab={t.id}
          icon={t.icon}
        >
          {t.title}
        </Tab>
      ))}

      <AnimatePresence>
        {selected && <Content dir={dir} selected={selected} tabs={tabs} />}
      </AnimatePresence>
    </div>
  );
};

const Tab: React.FC<{
  children: React.ReactNode;
  tab: number;
  handleSetSelected: (val: number | null) => void;
  selected: number | null;
  icon: React.ElementType;
}> = ({ children, tab, handleSetSelected, selected, icon: Icon }) => {
  return (
    <button
      id={`shift-tab-${tab}`}
      onMouseEnter={() => handleSetSelected(tab)}
      onClick={() => handleSetSelected(tab)}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
        selected === tab
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </button>
  );
};

const Content: React.FC<{
  selected: number;
  dir: "l" | "r" | null;
  tabs: TabConfig[];
}> = ({ selected, dir, tabs }) => {
  return (
    <motion.div
      id="overlay-content"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute left-0 top-[calc(100%_+_12px)] w-96 rounded-lg border border-border bg-popover shadow-lg p-4 z-50"
    >
      <Bridge />
      <Nub selected={selected} />

      {tabs.map((t) => (
        <div className="overflow-hidden" key={t.id}>
          {selected === t.id && (
            <motion.div
              initial={{
                opacity: 0,
                x: dir === "l" ? 100 : dir === "r" ? -100 : 0,
              }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <t.Component items={[]} onSelect={() => {}} />
            </motion.div>
          )}
        </div>
      ))}
    </motion.div>
  );
};

const Bridge = () => <div className="absolute -top-[12px] left-0 right-0 h-[12px]" />;

const Nub: React.FC<{ selected: number }> = ({ selected }) => {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    moveNub();
  }, [selected]);

  const moveNub = () => {
    if (selected) {
      const hoveredTab = document.getElementById(`shift-tab-${selected}`);
      const overlayContent = document.getElementById("overlay-content");

      if (!hoveredTab || !overlayContent) return;

      const tabRect = hoveredTab.getBoundingClientRect();
      const { left: contentLeft } = overlayContent.getBoundingClientRect();

      const tabCenter = tabRect.left + tabRect.width / 2 - contentLeft;

      setLeft(tabCenter);
    }
  };

  return (
    <motion.span
      style={{ clipPath: "polygon(0 0, 100% 0, 50% 50%, 0% 100%)" }}
      animate={{ left }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-tl border border-border bg-popover"
    />
  );
};

// Resource Card Components
export const ComponentsGrid: React.FC<{
  items: any[];
  onSelect: (item: any) => void;
}> = ({ items, onSelect }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Aucun composant disponible
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left group"
        >
          <div className="flex items-start gap-2">
            <Component className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{item.nom}</h4>
              {item.prompt && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {item.prompt.substring(0, 50)}...
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export const MediaGrid: React.FC<{
  items: any[];
  onSelect: (item: any) => void;
}> = ({ items, onSelect }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Aucun média disponible
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="p-2 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors group"
        >
          <div className="aspect-video bg-muted rounded mb-2 overflow-hidden">
            {item.url && (
              <img
                src={item.url}
                alt={item.nom}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <p className="text-xs font-medium truncate">{item.nom}</p>
        </button>
      ))}
    </div>
  );
};

export const FontsGrid: React.FC<{
  items: any[];
  onSelect: (item: any) => void;
}> = ({ items, onSelect }) => {
  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onSelect(item)}
          className="w-full p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left"
          style={{ fontFamily: item.nom }}
        >
          <p className="text-sm font-medium">{item.nom}</p>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: item.nom }}>
            The quick brown fox jumps
          </p>
        </button>
      ))}
    </div>
  );
};

export const ColorsGrid: React.FC<{
  items: any[];
  onSelect: (item: any) => void;
}> = ({ items, onSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onSelect(item)}
          className="p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left group"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded border border-border flex-shrink-0"
              style={{ backgroundColor: item.code }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.nom}</p>
              <p className="text-xs text-muted-foreground">{item.code}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export const PalettesGrid: React.FC<{
  items: any[];
  onSelect: (item: any) => void;
}> = ({ items, onSelect }) => {
  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => onSelect(item)}
          className="w-full p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {item.couleurs?.map((color: string, i: number) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded border border-border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-sm font-medium">{item.nom}</p>
          </div>
        </button>
      ))}
    </div>
  );
};
