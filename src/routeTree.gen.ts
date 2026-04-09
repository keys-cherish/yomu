/* eslint-disable */
// This file is auto-generated. Do not edit manually.
// Regenerate by running: npx @tanstack/router-cli generate

import { Route as rootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";
import { Route as LibraryRoute } from "./routes/library";
import { Route as SearchRoute } from "./routes/search";
import { Route as SettingsRoute } from "./routes/settings";
import { Route as SettingsGeneralRoute } from "./routes/settings.general";
import { Route as SettingsLibraryRoute } from "./routes/settings.library";
import { Route as SettingsDisplayRoute } from "./routes/settings.display";
import { Route as SettingsBackupRoute } from "./routes/settings.backup";
import { Route as BookBookIdRoute } from "./routes/book.$bookId";
import { Route as ReaderBookIdRoute } from "./routes/reader.$bookId";

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexRoute;
      parentRoute: typeof rootRoute;
    };
    "/library": {
      id: "/library";
      path: "/library";
      fullPath: "/library";
      preLoaderRoute: typeof LibraryRoute;
      parentRoute: typeof rootRoute;
    };
    "/search": {
      id: "/search";
      path: "/search";
      fullPath: "/search";
      preLoaderRoute: typeof SearchRoute;
      parentRoute: typeof rootRoute;
    };
    "/settings": {
      id: "/settings";
      path: "/settings";
      fullPath: "/settings";
      preLoaderRoute: typeof SettingsRoute;
      parentRoute: typeof rootRoute;
    };
    "/settings/general": {
      id: "/settings/general";
      path: "/general";
      fullPath: "/settings/general";
      preLoaderRoute: typeof SettingsGeneralRoute;
      parentRoute: typeof SettingsRoute;
    };
    "/settings/library": {
      id: "/settings/library";
      path: "/library";
      fullPath: "/settings/library";
      preLoaderRoute: typeof SettingsLibraryRoute;
      parentRoute: typeof SettingsRoute;
    };
    "/settings/display": {
      id: "/settings/display";
      path: "/display";
      fullPath: "/settings/display";
      preLoaderRoute: typeof SettingsDisplayRoute;
      parentRoute: typeof SettingsRoute;
    };
    "/settings/backup": {
      id: "/settings/backup";
      path: "/backup";
      fullPath: "/settings/backup";
      preLoaderRoute: typeof SettingsBackupRoute;
      parentRoute: typeof SettingsRoute;
    };
    "/book/$bookId": {
      id: "/book/$bookId";
      path: "/book/$bookId";
      fullPath: "/book/$bookId";
      preLoaderRoute: typeof BookBookIdRoute;
      parentRoute: typeof rootRoute;
    };
    "/reader/$bookId": {
      id: "/reader/$bookId";
      path: "/reader/$bookId";
      fullPath: "/reader/$bookId";
      preLoaderRoute: typeof ReaderBookIdRoute;
      parentRoute: typeof rootRoute;
    };
  }
}

// Create route tree
const IndexRouteWithParent = IndexRoute.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRoute,
} as any);

const LibraryRouteWithParent = LibraryRoute.update({
  id: "/library",
  path: "/library",
  getParentRoute: () => rootRoute,
} as any);

const SearchRouteWithParent = SearchRoute.update({
  id: "/search",
  path: "/search",
  getParentRoute: () => rootRoute,
} as any);

const SettingsRouteWithParent = SettingsRoute.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => rootRoute,
} as any);

const SettingsGeneralRouteWithParent = SettingsGeneralRoute.update({
  id: "/settings/general",
  path: "/general",
  getParentRoute: () => SettingsRouteWithParent,
} as any);

const SettingsLibraryRouteWithParent = SettingsLibraryRoute.update({
  id: "/settings/library",
  path: "/library",
  getParentRoute: () => SettingsRouteWithParent,
} as any);

const SettingsDisplayRouteWithParent = SettingsDisplayRoute.update({
  id: "/settings/display",
  path: "/display",
  getParentRoute: () => SettingsRouteWithParent,
} as any);

const SettingsBackupRouteWithParent = SettingsBackupRoute.update({
  id: "/settings/backup",
  path: "/backup",
  getParentRoute: () => SettingsRouteWithParent,
} as any);

const BookBookIdRouteWithParent = BookBookIdRoute.update({
  id: "/book/$bookId",
  path: "/book/$bookId",
  getParentRoute: () => rootRoute,
} as any);

const ReaderBookIdRouteWithParent = ReaderBookIdRoute.update({
  id: "/reader/$bookId",
  path: "/reader/$bookId",
  getParentRoute: () => rootRoute,
} as any);

export interface FileRoutesByFullPath {
  "/": typeof IndexRouteWithParent;
  "/library": typeof LibraryRouteWithParent;
  "/search": typeof SearchRouteWithParent;
  "/settings": typeof SettingsRouteWithParent;
  "/settings/general": typeof SettingsGeneralRouteWithParent;
  "/settings/library": typeof SettingsLibraryRouteWithParent;
  "/settings/display": typeof SettingsDisplayRouteWithParent;
  "/settings/backup": typeof SettingsBackupRouteWithParent;
  "/book/$bookId": typeof BookBookIdRouteWithParent;
  "/reader/$bookId": typeof ReaderBookIdRouteWithParent;
}

export const routeTree = rootRoute
  ._addFileChildren({
    IndexRoute: IndexRouteWithParent,
    LibraryRoute: LibraryRouteWithParent,
    SearchRoute: SearchRouteWithParent,
    SettingsRoute: SettingsRouteWithParent._addFileChildren({
      SettingsGeneralRoute: SettingsGeneralRouteWithParent,
      SettingsLibraryRoute: SettingsLibraryRouteWithParent,
      SettingsDisplayRoute: SettingsDisplayRouteWithParent,
      SettingsBackupRoute: SettingsBackupRouteWithParent,
    }),
    BookBookIdRoute: BookBookIdRouteWithParent,
    ReaderBookIdRoute: ReaderBookIdRouteWithParent,
  })
  ._addFileTypes<FileRoutesByFullPath>();
