import { BrowserRouter, Route, Routes } from 'react-router';
import { RequireCustomer } from './components/shop/RequireCustomer';
import { CartProvider } from './hooks/useCart';
import { CustomerAuthProvider } from './hooks/useCustomerAuth';
import { CurrentShopProvider } from './hooks/useCurrentShop';
import { BusinessProvider } from './hooks/useCurrentBusiness';
import { ToastProvider } from './hooks/useToast';
import { DashboardLayout } from './layouts/DashboardLayout';
import CreateBusinessPage from './pages/CreateBusinessPage';
import DashboardPage from './pages/DashboardPage';
import InboxPage from './pages/InboxPage';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import OrdersPage from './pages/OrdersPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import ProductsPage from './pages/ProductsPage';
import PublicStorePage from './pages/PublicStorePage';
import SelectBusinessPage from './pages/SelectBusinessPage';
import SettingsPage from './pages/SettingsPage';
import StoreEditorPage from './pages/StoreEditorPage';
import WhatsAppConnectPage from './pages/WhatsAppConnectPage';
import CartPage from './pages/shop/CartPage';
import CheckoutPage from './pages/shop/CheckoutPage';
import CustomerLoginPage from './pages/shop/CustomerLoginPage';
import CustomerRegisterPage from './pages/shop/CustomerRegisterPage';
import MyOrderDetailPage from './pages/shop/MyOrderDetailPage';
import MyOrdersPage from './pages/shop/MyOrdersPage';
import ProductDetailPage from './pages/shop/ProductDetailPage';

export default function App() {
  return (
    <ToastProvider>
      <BusinessProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <CurrentShopProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/create-business" element={<CreateBusinessPage />} />
                  <Route path="/businesses" element={<SelectBusinessPage />} />
                  <Route path="/store/:slug" element={<PublicStorePage />} />
                  <Route path="/store/:slug/product/:productId" element={<ProductDetailPage />} />
                  {/* Customer (demo login). /shop/:slug is kept so older links keep working. */}
                  <Route path="/shop/:slug" element={<PublicStorePage />} />
                  <Route path="/login" element={<CustomerLoginPage />} />
                  <Route path="/register" element={<CustomerRegisterPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<RequireCustomer><CheckoutPage /></RequireCustomer>} />
                  <Route path="/my-orders" element={<RequireCustomer><MyOrdersPage /></RequireCustomer>} />
                  <Route path="/my-orders/:orderId" element={<RequireCustomer><MyOrderDetailPage /></RequireCustomer>} />
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="store" element={<StoreEditorPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="orders/:orderId" element={<OrderDetailsPage />} />
                    <Route path="payments" element={<PaymentSettingsPage />} />
                    <Route path="whatsapp" element={<WhatsAppConnectPage />} />
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </BrowserRouter>
            </CurrentShopProvider>
          </CartProvider>
        </CustomerAuthProvider>
      </BusinessProvider>
    </ToastProvider>
  );
}
