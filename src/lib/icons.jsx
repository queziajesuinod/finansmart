// @ts-nocheck
// Registro central de ícones SVG (Lucide) — substitui os emojis estruturais.
import {
  LayoutDashboard, PlusCircle, ReceiptText, FileText, CreditCard, Landmark,
  ShoppingBag, Target, TrendingUp, TrendingDown, MessageCircle, Settings,
  Home, UtensilsCrossed, Car, Pill, Clapperboard, BookOpen, Shirt, Smartphone, Package,
  Wallet, PiggyBank, Scale, Pencil, Trash2, X, Check, Save, Plus,
  Lightbulb, ArrowLeftRight, RefreshCw, Users, Boxes, LayoutGrid,
  Trophy, Siren, ChartColumn, ShoppingCart, BanknoteArrowDown, FilePlus,
  ScrollText, Search, WalletCards, Component,
  Undo2, CircleCheck, TriangleAlert, SquareCheck, Square, Flag, Calendar,
  Lock, User, PartyPopper, CircleUser, KeyRound, Sparkles,
} from "lucide-react";

const TAB = {
  dashboard: LayoutDashboard, lancamentos: PlusCircle, extrato: ScrollText, importar: FileText,
  cartoes: CreditCard, emprestimos: BanknoteArrowDown, parcelados: ShoppingBag, metas: Trophy,
  historico: ChartColumn, assistente: MessageCircle, admin: Settings,
};

const CAT = {
  moradia: Home, alimentacao: UtensilsCrossed, transporte: Car, saude: Pill, lazer: Clapperboard,
  educacao: BookOpen, vestuario: Shirt, assinaturas: Smartphone, outros: Package,
};

export function TabIcon({ id, size = 15, ...p }) {
  const I = TAB[id] || Package;
  return <I size={size} strokeWidth={2} {...p} />;
}

export function CatIcon({ id, size = 17, ...p }) {
  const I = CAT[id] || Package;
  return <I size={size} strokeWidth={2} {...p} />;
}

export {
  Wallet, TrendingDown, PiggyBank, Scale, CreditCard, Landmark, ShoppingBag, MessageCircle,
  Pencil, Trash2, X, Check, Save, Plus, Lightbulb, ArrowLeftRight, RefreshCw, Target,
  TrendingUp, Users, Boxes, LayoutGrid, Settings, ReceiptText,
  Trophy, Siren, ChartColumn, ShoppingCart, BanknoteArrowDown, FilePlus,
  ScrollText, Search, WalletCards, Component, Package,
  Undo2, CircleCheck, TriangleAlert, SquareCheck, Square, Flag, Calendar,
  Lock, User, FileText, PartyPopper, CircleUser, KeyRound, Sparkles,
};

// (FileText já é importado acima para a aba "importar")
