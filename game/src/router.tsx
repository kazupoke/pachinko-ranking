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
        { path: "expand", element: <Expand /> },
        { path: "s/:shopId", element: <ShopView /> },
        { path: "lite", element: <LiteEntry /> },
        { path: "lite/build", element: <LitePicker /> },
        { path: "lite/view", element: <LiteView /> },
      ],
    },
    { path: "/dev/preview", element: <DevPreview /> },
    { path: "*", element: <NotFound /> },
  ],
  { basename: import.meta.env.BASE_URL }
);
