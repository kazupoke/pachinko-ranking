import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Home } from "./routes/Home";
import { MyShop } from "./routes/MyShop";
import { Collection } from "./routes/Collection";
import { Gacha } from "./routes/Gacha";
import { Favorites } from "./routes/Favorites";
import { MysteryShopper } from "./routes/MysteryShopper";
import { Expand } from "./routes/Expand";
import { ShopView } from "./routes/ShopView";
import { LiteEntry } from "./routes/lite/Entry";
import { LitePicker } from "./routes/lite/Picker";
import { LiteView } from "./routes/lite/View";
import { Onboarding } from "./routes/Onboarding";
import { Share } from "./routes/Share";
import { ManagerHub } from "./routes/manager/Hub";
import { BannerShop } from "./routes/manager/BannerShop";
import { Sell } from "./routes/manager/Sell";
import { Maintain } from "./routes/manager/Maintain";
import { Settings } from "./routes/manager/Settings";
import { Regulars } from "./routes/manager/Regulars";
import { Security } from "./routes/manager/Security";
import { DevPreview } from "./routes/dev/Preview";
import { NotFound } from "./routes/NotFound";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: "shop", element: <MyShop /> },
        { path: "collection", element: <Collection /> },
        { path: "gacha", element: <Gacha /> },
        { path: "favorites", element: <Favorites /> },
        { path: "mystery", element: <MysteryShopper /> },
        { path: "manager", element: <ManagerHub /> },
        { path: "manager/inspect", element: <MysteryShopper /> },
        { path: "manager/shop", element: <BannerShop /> },
        { path: "manager/sell", element: <Sell /> },
        { path: "manager/maintain", element: <Maintain /> },
        { path: "manager/settings", element: <Settings /> },
        { path: "manager/regulars", element: <Regulars /> },
        { path: "manager/security", element: <Security /> },
        { path: "expand", element: <Expand /> },
        { path: "s/:shopId", element: <ShopView /> },
        { path: "lite", element: <LiteEntry /> },
        { path: "lite/build", element: <LitePicker /> },
        { path: "lite/view", element: <LiteView /> },
      ],
    },
    { path: "/onboarding", element: <Onboarding /> },
    { path: "/share", element: <Share /> },
    { path: "/dev/preview", element: <DevPreview /> },
    { path: "*", element: <NotFound /> },
  ],
  { basename: import.meta.env.BASE_URL }
);
