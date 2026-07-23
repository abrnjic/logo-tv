import { useState, useEffect } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const item = window.localStorage.getItem('logo-tv-favorites');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.warn('Error reading localStorage', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('logo-tv-favorites', JSON.stringify(favorites));
    } catch (error) {
      console.warn('Error setting localStorage', error);
    }
  }, [favorites]);

  const toggleFavorite = (channelId) => {
    setFavorites(prev => {
      if (prev.includes(channelId)) {
        return prev.filter(id => id !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  const isFavorite = (channelId) => favorites.includes(channelId);

  return { favorites, toggleFavorite, isFavorite };
}
