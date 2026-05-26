export interface GalleryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  userName: string;
  catalogName: string;
  userId?: string;
  deviceId?: string;
  isFavorite: boolean;
  createdAt: string;
  isQuantumVerified?: boolean;
  isNft?: boolean;
  nftId?: string;
}

declare global {
  var galleryStore: GalleryItem[];
}

if (!global.galleryStore) {
  global.galleryStore = [
    {
      id: 'mock-1',
      imageUrl: 'https://picsum.photos/seed/1/512/512',
      prompt: 'A futuristic cyber city with neon lights',
      userName: 'Neo',
      catalogName: 'Neo\'s Cyberpunk Collection',
      userId: 'neo-123',
      isFavorite: true,
      isQuantumVerified: true,
      createdAt: new Date().toISOString()
    }
  ];
}

export const getGalleryItems = () => global.galleryStore;

export const addGalleryItem = (item: Omit<GalleryItem, 'id' | 'createdAt' | 'isFavorite' | 'isQuantumVerified' | 'isNft' | 'nftId'> & Partial<Pick<GalleryItem, 'isQuantumVerified' | 'isNft' | 'nftId'>>) => {
  const newItem: GalleryItem = {
    ...item,
    id: `gal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isFavorite: false,
    isQuantumVerified: item.isQuantumVerified || false,
    isNft: item.isNft || false,
    nftId: item.nftId,
    createdAt: new Date().toISOString()
  };
  global.galleryStore = [newItem, ...global.galleryStore];
  return newItem;
};

export const toggleFavorite = (id: string) => {
  const item = global.galleryStore.find(i => i.id === id);
  if (item) {
    item.isFavorite = !item.isFavorite;
  }
  return item;
};
