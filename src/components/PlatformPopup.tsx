import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Popup {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
}

export default function PlatformPopup() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchActivePopups();
  }, []);

  const fetchActivePopups = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_popups")
        .select("id, title, content, image_url, video_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setPopups(data);
        setOpen(true);
      }
    } catch (error) {
      console.error("Error fetching popups:", error);
    }
  };

  const handleNext = () => {
    if (currentPopupIndex < popups.length - 1) {
      setCurrentPopupIndex(currentPopupIndex + 1);
    } else {
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (popups.length === 0) return null;

  const currentPopup = popups[currentPopupIndex];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl max-w-[90vw] w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg sm:text-xl">{currentPopup.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <p className="whitespace-pre-wrap text-xs sm:text-sm">{currentPopup.content}</p>
          
          {currentPopup.image_url && (
            <div className="w-full overflow-hidden rounded-2xl">
              <img 
                src={currentPopup.image_url} 
                alt="Popup" 
                className="w-full max-h-48 sm:max-h-64 object-cover" 
              />
            </div>
          )}
          
          {currentPopup.video_url && (
            <div className="aspect-video rounded-2xl overflow-hidden">
              <iframe
                src={currentPopup.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          
          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {currentPopupIndex + 1} de {popups.length}
            </span>
            <Button 
              onClick={handleNext}
              className="h-9 sm:h-10 px-6 rounded-xl font-semibold"
            >
              {currentPopupIndex < popups.length - 1 ? "Próximo" : "Fechar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}