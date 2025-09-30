import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Trash2, Bot, User, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';

interface DayEventsPanelProps {
  selectedDate: Date | null;
  events: CalendarEvent[];
  onDeleteEvent?: (eventId: number) => void;
}

const DayEventsPanel = ({ selectedDate, events, onDeleteEvent }: DayEventsPanelProps) => {
  if (!selectedDate) {
    return null;
  }

  const getEventIcon = (type?: 'user' | 'ai' | 'task') => {
    switch (type) {
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getEventBadgeVariant = (type?: 'user' | 'ai' | 'task') => {
    switch (type) {
      case 'ai':
        return 'default';
      case 'task':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getEventTypeLabel = (type?: 'user' | 'ai' | 'task') => {
    switch (type) {
      case 'ai':
        return 'Tâche IA';
      case 'task':
        return 'Tâche';
      default:
        return 'Personnel';
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="border rounded-2xl overflow-hidden shadow-sm bg-card">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </h3>
          </div>
          {events.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {events.length} événement{events.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="p-4">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun événement prévu pour cette journée</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getEventIcon(event.type)}
                          <CardTitle className="text-sm font-medium truncate">
                            {event.name}
                          </CardTitle>
                        </div>
                        {event.description && (
                          <CardDescription className="text-xs line-clamp-2">
                            {event.description}
                          </CardDescription>
                        )}
                      </div>
                      
                      {onDeleteEvent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {event.time}
                      </div>
                      
                      <Badge variant={getEventBadgeVariant(event.type)} className="text-xs">
                        {getEventTypeLabel(event.type)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayEventsPanel;
