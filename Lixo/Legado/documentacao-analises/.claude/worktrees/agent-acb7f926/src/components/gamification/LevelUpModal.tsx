import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, Star, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
}

export const LevelUpModal = ({ isOpen, onClose, level }: LevelUpModalProps) => {
  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-transparent border-none shadow-none items-center justify-center flex flex-col">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotate: 5 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative w-full aspect-square flex flex-col items-center justify-center"
          >
            {/* Background Glow */}
            <div className="absolute inset-x-0 inset-y-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
            
            {/* Spinning Aura */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-full"
            />

            {/* Main Circle */}
            <div className="relative z-10 w-64 h-64 glass-card border-primary/20 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.3)] bg-black/60 backdrop-blur-2xl">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <Trophy className="w-16 h-16 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </motion.div>
                </div>
                
                <h2 className="text-3xl font-black text-white tracking-widest uppercase italic">
                  LEVEL UP!
                </h2>
                
                <div className="mt-2 flex items-center justify-center">
                  <span className="text-5xl font-black bg-gradient-to-b from-white to-primary bg-clip-text text-transparent italic px-2">
                    {level}
                  </span>
                </div>
                
                <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                  Nova Conquista
                </p>
              </motion.div>
            </div>

            {/* Decorative Stars */}
            <motion.div
              animate={{ y: [-10, 10, -10], x: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-10 left-10 text-primary/40"
            >
              <Star className="w-4 h-4 fill-current" />
            </motion.div>
            <motion.div
              animate={{ y: [10, -10, 10], x: [5, -5, 5] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute bottom-10 right-10 text-primary/40"
            >
              <Star className="w-6 h-6 fill-current" />
            </motion.div>

            {/* Close / Action Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 relative z-20"
            >
              <Button 
                onClick={onClose}
                className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] transition-all hover:scale-105 active:scale-95 text-lg"
              >
                CONTINUAR JORNADA
              </Button>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
};
