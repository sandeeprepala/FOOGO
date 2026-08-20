import { useQuery } from '@tanstack/react-query';
import { restaurantService } from '../services/restaurantService';
import { toNumericId } from '../utils/formatting';

export function useNearbyRestaurants(lat = 28.6139, lng = 77.2090, radius = 10) {
  return useQuery({
    queryKey: ['restaurants', 'nearby', lat, lng, radius],
    queryFn: async () => {
      try {
        const data = await restaurantService.getNearby(lat, lng, radius);
        if (data?.restaurants && Array.isArray(data.restaurants)) {
          return data.restaurants.map(r => ({ ...r, id: toNumericId(r.id, 1) }));
        }
        return [];
      } catch (err) {
        console.warn('[Nearby Restaurants error]', err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRestaurantMenu(restaurantId) {
  const numericRestId = toNumericId(restaurantId, 1);

  return useQuery({
    queryKey: ['restaurant', numericRestId, 'menu'],
    queryFn: async () => {
      if (!numericRestId) return [];
      try {
        const data = await restaurantService.getMenu(numericRestId);
        if (data?.menu_items && Array.isArray(data.menu_items)) {
          return data.menu_items.map(m => ({ ...m, id: toNumericId(m.id, 1) }));
        }
        return [];
      } catch (err) {
        console.warn('[Menu fetch error]', err);
        return [];
      }
    },
    enabled: !!numericRestId,
  });
}


