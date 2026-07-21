import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { CartModalProvider } from "@/hooks/useCartModal";
import { lazy, Suspense, memo } from "react";
import { Loader2 } from "lucide-react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SmoothScroll } from "@/components/SmoothScroll";
import { MobileNav } from "@/components/MobileNav";

const Home = lazy(() => import("@/pages/Home"));
const Category = lazy(() => import("@/pages/Category"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const NotFound = lazy(() => import("@/pages/not-found"));

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Cart = lazy(() => import("@/pages/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Profile = lazy(() => import("@/pages/Profile"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminOrderDetail = lazy(() => import("@/pages/AdminOrderDetail"));
const About = lazy(() => import("@/pages/About"));
const DeliveryTerms = lazy(() => import("@/pages/DeliveryTerms"));
const DistanceSalesAgreement = lazy(() => import("@/pages/DistanceSalesAgreement"));
const CancellationPolicy = lazy(() => import("@/pages/CancellationPolicy"));
const KVKK = lazy(() => import("@/pages/KVKK"));
const Store = lazy(() => import("@/pages/Store"));
const CardCatalog = lazy(() => import("@/pages/CardCatalog"));
const CardDetail = lazy(() => import("@/pages/CardDetail"));
const CardSet = lazy(() => import("@/pages/CardSet"));
const GamePage = lazy(() => import("@/pages/GamePage"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("@/pages/PaymentFail"));
const OrderTracking = lazy(() => import("@/pages/OrderTracking"));
const Collection = lazy(() => import("@/pages/Collection"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const Contact = lazy(() => import("@/pages/Contact"));
const Accessories = lazy(() => import("@/pages/Accessories"));
const RiftboundPage = lazy(() => import("@/pages/RiftboundPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Switch>
        <Route path="/" component={Home} />
        <Route path="/magaza" component={Store} />
        <Route path="/kartlar" component={CardCatalog} />
        <Route path="/kart/:slug" component={CardDetail} />
        <Route path="/set/:slug" component={CardSet} />
        <Route path="/oyun/:game" component={GamePage} />
        <Route path="/kategori/:slug" component={Category} />
        <Route path="/urun/:slug" component={ProductDetail} />
        <Route path="/giris" component={Login} />
        <Route path="/kayit" component={Register} />
        <Route path="/sifremi-unuttum" component={ForgotPassword} />
        <Route path="/sifre-sifirla" component={ResetPassword} />
        <Route path="/sepet" component={Cart} />
        <Route path="/odeme" component={Checkout} />
        <Route path="/odeme-basarili" component={PaymentSuccess} />
        <Route path="/odeme-basarisiz" component={PaymentFail} />
        <Route path="/siparis-takip" component={OrderTracking} />
        <Route path="/hesabim" component={Profile} />
        <Route path="/hesabim/siparislerim" component={Profile} />
        <Route path="/hakkimizda" component={About} />
        <Route path="/teslimat-kosullari" component={DeliveryTerms} />
        <Route path="/mesafeli-satis-sozlesmesi" component={DistanceSalesAgreement} />
        <Route path="/iptal-ve-iade" component={CancellationPolicy} />
        <Route path="/kvkk" component={KVKK} />
        <Route path="/koleksiyon" component={Collection} />
        <Route path="/favoriler" component={Favorites} />
        <Route path="/iletisim" component={Contact} />
        <Route path="/aksesuarlar" component={Accessories} />
        <Route path="/riftbound" component={RiftboundPage} />
        <Route path="/toov-admin/login" component={AdminLogin} />
        <Route path="/toov-admin/orders/:id" component={AdminOrderDetail} />
        <Route path="/toov-admin" component={AdminDashboard} />
        <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <CartModalProvider>
            <TooltipProvider>
              <div className="relative w-full pb-16 sm:pb-0">
                <SmoothScroll />
                <Toaster />
                <Router />
                <MobileNav />
              </div>
            </TooltipProvider>
          </CartModalProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
