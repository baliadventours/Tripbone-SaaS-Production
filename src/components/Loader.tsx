import { motion } from 'motion/react';
import { useSettings } from '../lib/SettingsContext';
import { useTenant } from '../lib/TenantContext';
import { getSafeImageUrl } from '../lib/utils';

export default function Loader({ fullScreen = true }: { fullScreen?: boolean }) {
  const { settings } = useSettings();
  const { tenant } = useTenant();
  
  const brandName = settings?.siteName || tenant?.companyName || 'Bali Adventours';
  const logoURL = settings?.logoURL || tenant?.logo;

  return (
    <div className={fullScreen ? "fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white" : "flex flex-col items-center justify-center p-12"}>
      <div className="relative flex items-center justify-center">
        {/* Animated outer ring */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-24 w-24 rounded-full border border-primary/10 absolute"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute h-24 w-24 rounded-full border-2 border-primary border-t-transparent"
        />
        
        {/* Logo or custom spinner inside */}
        <div className="h-20 w-20 flex items-center justify-center bg-white rounded-full shadow-sm overflow-hidden p-2 z-10">
          {logoURL ? (
            <img 
              src={getSafeImageUrl(logoURL)} 
              alt={brandName} 
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <p className="text-sm font-black text-gray-900 tracking-tighter uppercase">{brandName}</p>
        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">Crafting your perfect trip...</p>
      </motion.div>
    </div>
  );
}
