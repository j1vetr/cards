/**
 * Tek bootstrap noktası: tüm adapter'lar burada self-register edilir.
 * Yeni bir pazaryeri eklemek için: yeni adapter dosyasını yazıp aşağıya
 * tek satırlık import ekle — engine, routes, UI hiç değişmez.
 */

import "./trendyol/adapter";
// future: import "./n11/adapter";
// future: import "./hepsiburada/adapter";
// future: import "./amazon/adapter";

export { listRegisteredAdapters, createAdapter, getAdapterEntry, registerAdapter } from "./registry";
