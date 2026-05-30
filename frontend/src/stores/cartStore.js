import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create()(
  persist(
    (set, get) => ({
      carts: {},
      addToCart: (storeId, storeName, item) =>
        set((state) => {
           const cart = state.carts[storeId] || { storeId, storeName, items: [] }
           const existingItem = cart.items.find((i) => i.itemId === item.itemId)

           if (existingItem) {
              existingItem.quantity += item.quantity
           } else {
              cart.items.push(item)
           }

           return {
              carts: {
                 ...state.carts,
                 [storeId]: cart,
              },
           }
        }),
       removeFromCart: (storeId, itemId) =>
          set((state) => {
             const cart = state.carts[storeId]
             if (!cart) return state

             return {
               carts: {
                  ...state.carts,
                  [storeId]: {
                    ...cart,
                    items: cart.items.filter((i) => i.itemId !== itemId),
               },
              },
             }
         }),
        updateQuantity: (storeId, itemId, quantity) =>
           set((state) => {
             const cart = state.carts[storeId]
             if (!cart) return state

           const item = cart.items.find((i) => i.itemId === itemId)
           if (item) {
             item.quantity = quantity
           }

           return {
              carts: {
               ...state.carts,
               [storeId]: cart,
              },
           }
          }),
         clearCart: (storeId) =>
           set((state) => {
              const { [storeId]: _, ...rest } = state.carts
              return { carts: rest }
           }),
         getCartTotal: (storeId) => {
              const cart = get().carts[storeId]
              if (!cart) return 0
              return cart.items.reduce((total, item) => total + item.price * item.quantity, 0)
         },
        }),
        {
           name: 'cart-storage',
        }
     )
)
