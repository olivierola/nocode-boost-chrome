import { useState } from 'react';
import { FullScreenCalendar } from '@/components/ui/fullscreen-calendar';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import DayEventsPanel from '@/components/DayEventsPanel';
import { isSameDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const Calendar = () => {
  const { events, addEvent, deleteEvent } = useCalendarEvents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedDayForPanel, setSelectedDayForPanel] = useState<Date | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState<'user' | 'ai' | 'task'>('user');

  const handleAddEvent = () => {
    if (eventName && eventTime && selectedDate) {
      const datetime = new Date(selectedDate);
      const [hours, minutes] = eventTime.split(':');
      datetime.setHours(parseInt(hours), parseInt(minutes));

      addEvent(
        {
          name: eventName,
          time: eventTime,
          datetime: datetime.toISOString(),
          type: eventType,
        },
        selectedDate
      );

      setEventName('');
      setEventTime('');
      setSelectedDate(undefined);
      setIsDialogOpen(false);
    }
  };

  // Get events for selected day
  const selectedDayEvents = selectedDayForPanel
    ? events
        .filter((event) => isSameDay(event.day, selectedDayForPanel))
        .flatMap((event) => event.events)
    : [];

  const handleDayClick = (day: Date) => {
    setSelectedDayForPanel(day);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto">
      <FullScreenCalendar 
        data={events} 
        onAddEvent={() => setIsDialogOpen(true)}
        onDayClick={handleDayClick}
      />

      <DayEventsPanel 
        selectedDate={selectedDayForPanel}
        events={selectedDayEvents}
        onDeleteEvent={deleteEvent}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajouter un événement</DialogTitle>
            <DialogDescription>
              Créez un nouvel événement dans votre calendrier
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="event-name">Nom de l'événement</Label>
              <Input
                id="event-name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Réunion d'équipe"
              />
            </div>

            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-time">Heure</Label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-type">Type d'événement</Label>
              <Select value={eventType} onValueChange={(value: any) => setEventType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Personnel</SelectItem>
                  <SelectItem value="ai">Tâche IA</SelectItem>
                  <SelectItem value="task">Tâche</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddEvent}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
