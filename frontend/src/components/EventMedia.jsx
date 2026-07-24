import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExpand, FaTimes, FaPlay, FaVideo } from 'react-icons/fa';

const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || "http://localhost:5000";

export const getImageUrl = (url) => {
  if (!url) return "/about_images/kolekar_real_1.jpg";
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${ASSETS_URL}${url}`;
  return `${ASSETS_URL}/${url}`;
};

export const isVideoUrl = (url) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mkv|mov)(\?.*)?$/i) || url.includes('/video/') || url.includes('youtube.com') || url.includes('vimeo.com');
};

const EventMedia = ({ 
  src, 
  alt = "Event Media", 
  aspectRatio = "aspect-video", 
  objectFit = "cover",
  allowLightbox = true,
  className = "",
  videoControls = true,
  autoPlayVideo = false
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const mediaUrl = getImageUrl(src);
  const isVideo = isVideoUrl(src);

  return (
    <>
      <div className={`relative w-full ${aspectRatio} overflow-hidden rounded-2xl md:rounded-3xl bg-stone-100 flex items-center justify-center group shrink-0 ${className}`}>
        {/* Media Content */}
        {isVideo ? (
          <video
            src={mediaUrl}
            controls={videoControls}
            autoPlay={autoPlayVideo}
            playsInline
            preload="metadata"
            className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} object-center transition-transform duration-700 ease-out group-hover:scale-105`}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={alt}
            loading="lazy"
            className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} object-center transition-transform duration-700 ease-out group-hover:scale-105`}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/about_images/kolekar_real_1.jpg";
            }}
          />
        )}

        {/* Lightbox Trigger Icon for Images */}
        {!isVideo && allowLightbox && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsLightboxOpen(true);
            }}
            className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-md shadow-lg"
            title="Click to view full size"
          >
            <FaExpand size={12} />
          </button>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors border border-white/20"
              title="Close Full Screen"
            >
              <FaTimes size={20} />
            </button>

            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={mediaUrl}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EventMedia;
