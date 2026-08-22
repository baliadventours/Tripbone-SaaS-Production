import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Car, 
  Users, 
  Briefcase, 
  Fuel, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Check, 
  UserCheck, 
  Key, 
  Star, 
  ChevronRight,
  Zap,
  Clock,
  Compass
} from 'lucide-react';
import { RentalVehicle, RentalCategory, RentalServiceMode } from '../../types';
import { getRentalVehicles } from '../../lib/carRentalService';
import { useSettings } from '../../lib/SettingsContext';
import { useTenant } from '../../lib/TenantContext';
import FormattedPrice from '../FormattedPrice';
import SmartImage from '../SmartImage';
import RentalBookingModal from '../CarRental/RentalBookingModal';
import { cn } from '../../lib/utils';

export default function CarRentalShowcase() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { tenantId } = useTenant();

  const [vehicles, setVehicles] = useState<RentalVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeMode, setActiveMode] = useState<RentalServiceMode>('with_driver');

  // Selected vehicle for booking modal
  const [bookingVehicle, setBookingVehicle] = useState<RentalVehicle | null>(null);

  const isModuleEnabled = settings?.carRentalModule?.enabled ?? true;
  const isHomepageShowcaseEnabled = (settings?.carRentalModule?.showOnHomepage ?? true) && isModuleEnabled;

  const sectionTitle = settings?.carRentalModule?.moduleTitle || "Private Car Rentals & Chauffeur Charters";
  const sectionSubtitle = settings?.carRentalModule?.moduleSubtitle || "Explore Bali at your own pace with clean modern fleet vehicles and licensed private drivers.";

  useEffect(() => {
    async function loadFleet() {
      try {
        setLoading(true);
        const data = await getRentalVehicles(tenantId);
        setVehicles(data.filter(v => v.status !== 'hidden'));
      } catch (err) {
        console.error('Error loading rental fleet:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFleet();
  }, [tenantId]);

  const categories = useMemo(() => {
    const list: { id: string; label: string }[] = [
      { id: 'all', label: 'All Fleet' },
      { id: 'standard_mpv', label: 'Family MPV' },
      { id: 'executive', label: 'Executive' },
      { id: 'luxury_vip', label: 'Luxury VIP' },
      { id: 'minibus', label: 'Minibus / Van' },
      { id: 'economy', label: 'City Compact' },
    ];
    return list;
  }, []);

  const filteredVehicles = useMemo(() => {
    let list = vehicles;
    if (selectedCategory !== 'all') {
      list = list.filter(v => v.category === selectedCategory);
    }
    return list;
  }, [vehicles, selectedCategory]);

  if (!isHomepageShowcaseEnabled) return null;

  return (
    <section id="car-rental-showcase" className="py-16 md:py-24 bg-gradient-to-b from-gray-50/60 to-white relative overflow-hidden border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-wider mb-3">
              <Car className="w-3.5 h-3.5" />
              <span>Chauffeur & Fleet Rental</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
              {sectionTitle}
            </h2>
            <p className="text-sm md:text-base text-gray-600 mt-2 font-medium">
              {sectionSubtitle}
            </p>
          </div>

          {/* Service Mode Toggle Switcher */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setActiveMode('with_driver')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                activeMode === 'with_driver'
                  ? "bg-white text-gray-950 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <UserCheck className="w-4 h-4 text-primary" />
              <span>With Driver & Gas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('self_drive')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                activeMode === 'self_drive'
                  ? "bg-white text-gray-950 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Key className="w-4 h-4 text-primary" />
              <span>Self-Drive (Car Only)</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border",
                selectedCategory === cat.id
                  ? "bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/10"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Fleet Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-96 rounded-3xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="bg-gray-50 rounded-3xl p-12 text-center border border-gray-100">
            <Car className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No vehicles found in this category</h3>
            <p className="text-xs text-gray-500 mt-1">Please choose another category or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => {
              const withDriverConfig = vehicle.pricing?.withDriver;
              const selfDriveConfig = vehicle.pricing?.selfDrive;

              const isWithDriverAvailable = withDriverConfig?.enabled;
              const isSelfDriveAvailable = selfDriveConfig?.enabled;

              const displayRate = activeMode === 'with_driver'
                ? (withDriverConfig?.fullDayPrice || withDriverConfig?.halfDayPrice || 48)
                : (selfDriveConfig?.dailyPrice || 25);

              const rateUnit = activeMode === 'with_driver'
                ? (withDriverConfig?.fullDayPrice ? '/ 10h Day' : '/ Half Day')
                : '/ 24h Day';

              return (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white rounded-3xl overflow-hidden border border-gray-150 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col text-left"
                >
                  {/* Image Container */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                    <SmartImage
                      src={vehicle.featuredImage}
                      alt={vehicle.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
                        {vehicle.category.replace('_', ' ')}
                      </span>
                      {vehicle.isPopular && (
                        <span className="px-2.5 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Popular</span>
                        </span>
                      )}
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-xl bg-white/90 backdrop-blur-md text-gray-900 text-xs font-black flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{vehicle.rating || 5.0}</span>
                      <span className="text-[10px] text-gray-500 font-medium">({vehicle.reviewsCount || 40}+)</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Vehicle Title & Model */}
                      <h3 className="font-black text-base md:text-lg text-gray-900 group-hover:text-primary transition-colors leading-tight">
                        {vehicle.name}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {vehicle.brand} • Model {vehicle.year || 2024}
                      </p>

                      {/* Specs Matrix */}
                      <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold">
                          <Users className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{vehicle.passengerCapacity} Seats</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold">
                          <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{vehicle.luggageCapacity} Bags</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-bold">
                          <Zap className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="capitalize">{vehicle.transmission}</span>
                        </div>
                      </div>

                      {/* Included Features Checklist */}
                      <div className="space-y-1.5">
                        {vehicle.features.slice(0, 3).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3] shrink-0" />
                            <span className="line-clamp-1">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                          {activeMode === 'with_driver' ? 'Charter Rate' : 'Self-Drive Rate'}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg md:text-xl font-black text-gray-950">
                            <FormattedPrice amount={displayRate} />
                          </span>
                          <span className="text-[11px] font-bold text-gray-500">
                            {rateUnit}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBookingVehicle(vehicle)}
                        className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all shrink-0"
                      >
                        <span>Book Car</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* View All Fleet Footer CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/rentals"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gray-950 hover:bg-gray-800 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-gray-950/10 hover:shadow-gray-950/20 active:scale-95"
          >
            <span>View All Fleet & Custom Charters</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingVehicle && (
        <RentalBookingModal
          isOpen={!!bookingVehicle}
          onClose={() => setBookingVehicle(null)}
          vehicle={bookingVehicle}
          initialMode={activeMode}
        />
      )}
    </section>
  );
}
