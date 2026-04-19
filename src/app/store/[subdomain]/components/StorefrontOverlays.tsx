"use client"

import React from 'react';
import dynamic from 'next/dynamic';
import { 
  useStoreData, 
  useStoreCart, 
  useStoreSession 
} from '@/providers/storefront';

const AddedToCartToast = dynamic(
  () => import('./AddedToCartToast').then((mod) => mod.AddedToCartToast),
  { ssr: false }
);
const LoginModal = dynamic(
  () => import('@/components/LoginModal').then((mod) => mod.LoginModal),
  { ssr: false }
);
const CheckoutModal = dynamic(
  () => import('@/components/CheckoutModal').then((mod) => mod.CheckoutModal),
  { ssr: false }
);
const CartDialog = dynamic(
  () => import('./CartDialog').then((mod) => mod.CartDialog),
  { ssr: false }
);

export function StorefrontOverlays() {
  const { merchant, loaderConfig } = useStoreData();
  const { 
    cart, setCart,
    isCartOpen, setIsCartOpen, isCheckoutOpen, setIsCheckoutOpen,
    prefilledInfo, prefilledPayment,
    openCheckoutAfterLogin, setOpenCheckoutAfterLogin,
    showAddedToCart, lastAddedItems, setShowAddedToCart
  } = useStoreCart();
  const { currentUser, setCurrentUser, sessionId, setConsumerEmail, isLoginOpen, setIsLoginOpen, subdomain: storeSubdomain } = useStoreSession();

  if (!merchant) return null;

  return (
    <>
      {isCartOpen && (
        <CartDialog
          isCartOpen={isCartOpen}
          setIsCartOpen={setIsCartOpen}
        />
      )}

      {isLoginOpen && (
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => {
            setIsLoginOpen(false);
            setOpenCheckoutAfterLogin(false);
          }}
          subdomain={storeSubdomain}
          merchantName={merchant.store_name}
          logoUrl={loaderConfig.logoUrl}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setConsumerEmail(user.email);
            if (openCheckoutAfterLogin) {
              setIsCheckoutOpen(true);
              setOpenCheckoutAfterLogin(false);
            }
          }}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          subdomain={storeSubdomain}
          cart={cart}
          setCart={setCart}
          merchant={merchant}
          user={currentUser}
          sessionId={sessionId}
          prefilledInfo={prefilledInfo}
          prefilledPayment={prefilledPayment}
        />
      )}

      {showAddedToCart && (
        <AddedToCartToast
          showAddedToCart={showAddedToCart}
          lastAddedItems={lastAddedItems}
          setShowAddedToCart={setShowAddedToCart}
          subdomain={storeSubdomain}
        />
      )}
    </>
  );
}
