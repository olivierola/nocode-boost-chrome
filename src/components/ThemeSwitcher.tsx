import { Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const themes = [
  { name: 'Bordeaux', value: 'bordeaux', hsl: '345 75% 30%' },
  { name: 'Bleu Foncé', value: 'blue', hsl: '220 85% 35%' },
  { name: 'Violet', value: 'purple', hsl: '270 75% 40%' },
  { name: 'Vert', value: 'green', hsl: '150 65% 35%' },
  { name: 'Marron', value: 'brown', hsl: '25 60% 35%' },
  { name: 'Orange', value: 'orange', hsl: '30 85% 50%' },
  { name: 'Rose', value: 'pink', hsl: '330 70% 45%' },
];

export const ThemeSwitcher = () => {
  const handleThemeChange = (hsl: string) => {
    document.documentElement.style.setProperty('--primary', hsl);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => handleThemeChange(theme.hsl)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <div
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: `hsl(${theme.hsl})` }}
              />
              <span>{theme.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
