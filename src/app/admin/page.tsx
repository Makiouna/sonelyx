'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import ScannerModal from '@/components/scanner-modal';
import { useRemoteScanner } from '@/lib/remote-scanner-context';
import { Loader2, Plus, Edit2, Trash2, Users, Sliders, DollarSign, TrendingUp, BarChart3, Info, ChevronLeft, Tag, FileText, CreditCard, Camera, QrCode, X } from 'lucide-react';

interface EquipmentItem {
  id: string;
  cat: string;
  catLabel: string;
  brand: string;
  name: string;
  desc: string;
  specs: string[];
  price: number;
  priceType: 'numeric' | 'on_request';
  priceTax: 'HT' | 'TTC';
  purchasePrice: number;
  quantity: number;
  image: string | null;
}

interface CategoryItem {
  id: string;
  label: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const hasConfirmedAdmin = useRef(false);
  const { registerConsumer, unregisterConsumer } = useRemoteScanner();

  // Refs for stable remote scan handler closures
  const equipmentRef = useRef<EquipmentItem[]>([]);
  const editingItemRef = useRef<EquipmentItem | null>(null);
  const assigningQrToItemIdRef = useRef<string | null>(null);
  const scanningNewItemIndexRef = useRef<number | null>(null);
  const newItemsQrCodesRef = useRef<Record<number, string>>({});

  // Views: 'list' | 'add' | 'edit'
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'catalogue' | 'categories' | 'users' | 'settings' | 'quotes'>('catalogue');
  const [adminCoeffWeekend, setAdminCoeffWeekend] = useState('1.4');
  const [adminCoeff3Jours, setAdminCoeff3Jours] = useState('1.8');
  const [adminCoeffSemaine, setAdminCoeffSemaine] = useState('3.0');
  
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(25);

  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  
  // Physical items management states
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isLocalScannerOpen, setIsLocalScannerOpen] = useState(false);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);

  // Form states for Equipment
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cat, setCat] = useState('');
  const [desc, setDesc] = useState('');
  const [specs, setSpecs] = useState<string[]>([]);
  const [newSpecText, setNewSpecText] = useState('');

  const handleAddSpec = () => {
    const trimmed = newSpecText.trim();
    if (trimmed) {
      setSpecs(prev => [...prev, trimmed]);
      setNewSpecText('');
    }
  };

  const handleRemoveSpec = (index: number) => {
    setSpecs(prev => prev.filter((_, i) => i !== index));
  };
  const [priceType, setPriceType] = useState<'numeric' | 'on_request'>('numeric');
  const [priceTax, setPriceTax] = useState<'HT' | 'TTC'>('HT');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [newItemsQrCodes, setNewItemsQrCodes] = useState<Record<number, string>>({});
  const [scanningNewItemIndex, setScanningNewItemIndex] = useState<number | null>(null);
  const [assigningQrToItemId, setAssigningQrToItemId] = useState<string | null>(null);
  const [image, setImage] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Form states for Category
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Form states for Settings
  const [adminTva, setAdminTva] = useState('20');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Payment settings
  const [adminIban, setAdminIban] = useState('');
  const [adminBic, setAdminBic] = useState('');
  const [adminPaymentInstructions, setAdminPaymentInstructions] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Admin Quotes list states
  const [adminQuotes, setAdminQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [quotesActionLoading, setQuotesActionLoading] = useState<string | null>(null);

  // Edit Quote state variables
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editAddItemSelect, setEditAddItemSelect] = useState('');
  const [editDiscount, setEditDiscount] = useState(0);
  const [clientSearch, setClientSearch] = useState('');

  // Security route guard — once admin is confirmed, never redirect again
  // (prevents spurious redirects during background session re-fetches)
  useEffect(() => {
    if (isPending) return;
    if (session && (session.user as any).role === 'admin') {
      hasConfirmedAdmin.current = true;
      return;
    }
    if (!hasConfirmedAdmin.current) {
      router.push('/');
    }
  }, [isPending, session, router]);

  // Fetch equipment list
  async function fetchEquipment() {
    setLoadingEquipment(true);
    try {
      const res = await fetch('/api/equipment');
      const data = await res.json();
      if (data.success) {
        setEquipment(data.items);
      }
    } catch (e) {
      console.error('Error fetching equipment:', e);
    } finally {
      setLoadingEquipment(false);
    }
  }

  // Fetch settings parameters
  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setAdminTva(String(data.tvaRate));
        setAdminCoeffWeekend(String(data.coeffWeekend));
        setAdminCoeff3Jours(String(data.coeff3Jours));
        setAdminCoeffSemaine(String(data.coeffSemaine));
        setAdminIban(data.iban || '');
        setAdminBic(data.bic || '');
        setAdminPaymentInstructions(data.paymentInstructions || '');
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  }

  // Handle dynamic settings update
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage('');
    setSettingsError('');
    setSettingsLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tvaRate: Number(adminTva),
          coeffWeekend: Number(adminCoeffWeekend),
          coeff3Jours: Number(adminCoeff3Jours),
          coeffSemaine: Number(adminCoeffSemaine),
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage('Paramètres de TVA et coefficients mis à jour avec succès.');
        fetchSettings();
        fetchEquipment();
      } else {
        setSettingsError(data.error || 'Une erreur est survenue.');
      }
    } catch (err: any) {
      setSettingsError(err.message || 'Une erreur est survenue.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdatePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentMessage('');
    setPaymentError('');
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iban: adminIban, bic: adminBic, paymentInstructions: adminPaymentInstructions })
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMessage('Coordonnées bancaires mises à jour.');
        fetchSettings();
      } else {
        setPaymentError(data.error || 'Une erreur est survenue.');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Une erreur est survenue.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Fetch quotes list for administrators
  async function fetchAdminQuotes() {
    setLoadingQuotes(true);
    try {
      const res = await fetch('/api/admin/quotes');
      const data = await res.json();
      if (data.success) {
        setAdminQuotes(data.quotes);
      }
    } catch (e) {
      console.error('Error fetching admin quotes:', e);
    } finally {
      setLoadingQuotes(false);
    }
  }

  // Approve or cancel user quote
  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: 'validated' | 'cancelled') => {
    setQuotesActionLoading(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminQuotes();
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch (e) {
      console.error('Error updating quote status:', e);
      alert('Une erreur est survenue.');
    } finally {
      setQuotesActionLoading(null);
    }
  };
  // Edit Quote Handlers
  const startEditingQuote = (q: any) => {
    setEditingQuoteId(q.id);
    setEditStartDate(q.startDate);
    setEditEndDate(q.endDate);
    setEditNotes(q.notes || '');
    setEditItems([...q.items]);
    setEditDiscount(q.discount || 0);
    setEditAddItemSelect(equipment.length > 0 ? equipment[0].id : '');
  };

  const handleAddEditItem = (itemId: string) => {
    if (!itemId) return;
    const eqItem = equipment.find(e => e.id === itemId);
    if (!eqItem) return;

    if (editItems.some(i => i.id === itemId)) {
      alert("Cet équipement est déjà dans le devis.");
      return;
    }

    setEditItems([
      ...editItems,
      {
        id: eqItem.id,
        name: eqItem.name,
        brand: eqItem.brand,
        catLabel: eqItem.catLabel,
        price: eqItem.price,
        priceType: eqItem.priceType,
        priceTax: eqItem.priceTax,
        quantity: 1,
        image: eqItem.image,
      }
    ]);
  };

  const handleUpdateEditItemQty = (itemId: string, delta: number) => {
    const eqItem = equipment.find(e => e.id === itemId);
    const maxQty = eqItem ? eqItem.quantity : 999;

    setEditItems(
      editItems.map(item => {
        if (item.id === itemId) {
          const nextQty = Math.max(1, Math.min(maxQty, item.quantity + delta));
          return { ...item, quantity: nextQty };
        }
        return item;
      })
    );
  };

  const handleUpdateEditItemPrice = (itemId: string, newPrice: number) => {
    setEditItems(
      editItems.map(item => {
        if (item.id === itemId) {
          return { ...item, price: newPrice };
        }
        return item;
      })
    );
  };

  const handleRemoveEditItem = (itemId: string) => {
    setEditItems(editItems.filter(item => item.id !== itemId));
  };

  const calculateEditTotals = () => {
    let subtotalHT = 0;
    let subtotalTTC = 0;
    const tva = Number(adminTva) || 20;
    const weekend = Number(adminCoeffWeekend) || 1.4;
    const coeff3 = Number(adminCoeff3Jours) || 1.8;
    const coeffSem = Number(adminCoeffSemaine) || 3.0;
    const discountVal = Number(editDiscount) || 0;

    editItems.forEach(item => {
      if (item.priceType === 'numeric') {
        let priceHT = item.price;
        let priceTTC = item.price;

        if (item.priceTax === 'HT') {
          priceTTC = priceHT * (1 + tva / 100);
        } else {
          priceHT = priceTTC / (1 + tva / 100);
        }

        subtotalHT += priceHT * item.quantity;
        subtotalTTC += priceTTC * item.quantity;
      }
    });

    let duration = 1;
    if (editStartDate && editEndDate) {
      const start = new Date(editStartDate);
      const end = new Date(editEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    let coeff = 1.0;
    if (duration === 2) {
      coeff = weekend;
    } else if (duration === 3) {
      coeff = coeff3;
    } else if (duration >= 4 && duration <= 6) {
      coeff = duration * 0.7;
    } else if (duration >= 7) {
      coeff = coeffSem * (duration / 7);
    }

    // Apply global discount
    const rawHT = subtotalHT * coeff;
    const rawTTC = subtotalTTC * coeff;
    const totalHT = Math.round(rawHT * (1 - discountVal / 100) * 100) / 100;
    const totalTTC = Math.round(rawTTC * (1 - discountVal / 100) * 100) / 100;

    return { totalHT, totalTTC, duration, coeff };
  };

  const handleSaveEditedQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuoteId) return;

    if (editItems.length === 0) {
      alert("Le devis doit contenir au moins un article.");
      return;
    }

    const { totalHT, totalTTC } = calculateEditTotals();
    setQuotesActionLoading(editingQuoteId);

    try {
      const res = await fetch(`/api/quotes/${editingQuoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: editStartDate,
          endDate: editEndDate,
          notes: editNotes,
          items: editItems,
          totalHT,
          totalTTC,
          discount: editDiscount,
          status: 'modified_by_admin', // requires customer approval
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingQuoteId(null);
        fetchAdminQuotes();
      } else {
        alert(data.error || "Une erreur est survenue lors de l'enregistrement.");
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue.");
    } finally {
      setQuotesActionLoading(null);
    }
  };
  // Fetch categories list
  async function fetchCategories() {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
        // Default category in form if empty
        if (data.categories.length > 0 && !cat) {
          setCat(data.categories[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      setLoadingCategories(false);
    }
  }

  // Fetch users list
  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (session && (session.user as any).role === 'admin') {
      fetchEquipment();
      fetchCategories();
      fetchUsers();
      fetchSettings();
      fetchAdminQuotes();
    }
  }, [session]);

  // Keep refs in sync for remote scan handler closures
  useEffect(() => { equipmentRef.current = equipment; }, [equipment]);
  useEffect(() => { editingItemRef.current = editingItem; }, [editingItem]);
  useEffect(() => { assigningQrToItemIdRef.current = assigningQrToItemId; }, [assigningQrToItemId]);
  useEffect(() => { scanningNewItemIndexRef.current = scanningNewItemIndex; }, [scanningNewItemIndex]);
  useEffect(() => { newItemsQrCodesRef.current = newItemsQrCodes; }, [newItemsQrCodes]);

  // Remote scanner — PRIORITY 10: global product search (always active on admin page)
  useEffect(() => {
    registerConsumer('admin-global-search', 10, async (qrCodeId) => {
      const res = await fetch(`/api/equipment/scan?qrCodeId=${qrCodeId}`);
      const data = await res.json();
      if (data.success && data.productId) {
        const item = equipmentRef.current.find(e => e.id === data.productId);
        if (item) {
          showEditView(item);
        } else {
          throw new Error('Équipement introuvable — actualisez la liste.');
        }
      } else {
        throw new Error(data.error || 'QR code non reconnu.');
      }
    });
    return () => unregisterConsumer('admin-global-search');
  }, [registerConsumer, unregisterConsumer]);

  // Remote scanner — PRIORITY 100: active modal scan (adding/assigning QR or global scan modal)
  useEffect(() => {
    if (!isLocalScannerOpen && !isGlobalScannerOpen) {
      unregisterConsumer('admin-modal-scan');
      return;
    }
    registerConsumer('admin-modal-scan', 100, async (qrCodeId) => {
      if (isGlobalScannerOpen) {
        const res = await fetch(`/api/equipment/scan?qrCodeId=${qrCodeId}`);
        const data = await res.json();
        if (!data.success || !data.productId) throw new Error(data.error || 'QR code non reconnu.');
        const item = equipmentRef.current.find(e => e.id === data.productId);
        if (!item) throw new Error('Équipement introuvable.');
        showEditView(item);
        setIsGlobalScannerOpen(false);
      } else if (isLocalScannerOpen) {
        const newItemIdx = scanningNewItemIndexRef.current;
        const itemId = assigningQrToItemIdRef.current;
        const eq = editingItemRef.current;
        if (newItemIdx !== null) {
          // Scanning QR for a pending item during product creation
          setNewItemsQrCodes(prev => ({ ...prev, [newItemIdx]: qrCodeId }));
          setIsLocalScannerOpen(false);
          setScanningNewItemIndex(null);
        } else if (itemId) {
          // Assigning QR to an existing item without one
          const res = await fetch(`/api/product-items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCodeId }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "Erreur lors de l'assignation.");
          if (eq) fetchPhysicalItems(eq.id);
          setIsLocalScannerOpen(false);
          setAssigningQrToItemId(null);
        } else if (eq) {
          // Creating a new item with scanned QR in edit view
          const res = await fetch(`/api/equipment/${eq.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCodeId }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "Erreur lors de l'ajout.");
          fetchPhysicalItems(eq.id);
          fetchEquipment();
          setIsLocalScannerOpen(false);
        } else {
          throw new Error('Aucun contexte de scan actif. Réouvrez le scanner.');
        }
      }
    });
    return () => unregisterConsumer('admin-modal-scan');
  }, [isLocalScannerOpen, isGlobalScannerOpen, registerConsumer, unregisterConsumer]);

  const showListView = () => {
    setView('list');
    setEditingItem(null);
  };

  const showAddView = () => {
    setName('');
    setBrand('');
    setCat(categories.length > 0 ? categories[0].id : '');
    setDesc('');
    setSpecs([]);
    setNewSpecText('');
    setPriceType('numeric');
    setPriceTax('HT');
    setPrice('');
    setPurchasePrice('');
    setNewItemsCount(0);
    setNewItemsQrCodes({});
    setScanningNewItemIndex(null);
    setImage('');
    setFormError('');
    setView('add');
  };

  const showEditView = (item: EquipmentItem) => {
    setEditingItem(item);
    setName(item.name);
    setBrand(item.brand);
    setCat(item.cat);
    setDesc(item.desc);
    setSpecs(item.specs || []);
    setNewSpecText('');
    setPriceType(item.priceType || 'numeric');
    setPriceTax(item.priceTax || 'HT');
    setPrice(String(item.price));
    setPurchasePrice(String(item.purchasePrice));
    setImage(item.image || '');
    setFormError('');
    setView('edit');
  };

  const fetchPhysicalItems = async (productId: string) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/equipment/${productId}`);
      const data = await res.json();
      if (data.success) {
        setEditingItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (view === 'edit' && editingItem) {
      fetchPhysicalItems(editingItem.id);
    }
  }, [view, editingItem]);

  const handleUpdatePhysicalItemStatus = async (itemId: string, status: string) => {
    try {
      const res = await fetch(`/api/product-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        if (editingItem) {
          fetchPhysicalItems(editingItem.id);
          fetchEquipment(); // Update main stock count
        }
      } else {
        alert(data.error || 'Erreur de mise à jour.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    }
  };

  const handleDeletePhysicalItem = async (itemId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet exemplaire ?')) return;

    try {
      const res = await fetch(`/api/product-items/${itemId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (editingItem) {
          fetchPhysicalItems(editingItem.id);
          fetchEquipment(); // Update main stock count
        }
      } else {
        alert(data.error || 'Erreur de suppression.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    }
  };

  const handleLocalScanSuccess = async (qrCodeId: string) => {
    // Case 1: scanning a QR code for a new item during product creation
    if (scanningNewItemIndex !== null) {
      setNewItemsQrCodes(prev => ({ ...prev, [scanningNewItemIndex]: qrCodeId }));
      setIsLocalScannerOpen(false);
      setScanningNewItemIndex(null);
      return;
    }

    // Case 2: assigning a QR code to an existing item without one (in edit view)
    if (assigningQrToItemId) {
      try {
        const res = await fetch(`/api/product-items/${assigningQrToItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCodeId })
        });
        const data = await res.json();
        if (data.success) {
          if (editingItem) fetchPhysicalItems(editingItem.id);
          setIsLocalScannerOpen(false);
          setAssigningQrToItemId(null);
        } else {
          alert(data.error || 'Erreur lors de l\'assignation du QR code.');
        }
      } catch (e) {
        console.error(e);
        alert('Une erreur est survenue.');
      }
      return;
    }

    if (!editingItem) return;

    // Creating a new item with a scanned QR code
    try {
      const res = await fetch(`/api/equipment/${editingItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeId })
      });
      const data = await res.json();
      if (data.success) {
        fetchPhysicalItems(editingItem.id);
        fetchEquipment();
        setIsLocalScannerOpen(false);
      } else {
        alert(data.error || 'Erreur lors de l\'ajout de l\'exemplaire.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    }
  };

  const handleGlobalScanSuccess = async (qrCodeId: string) => {
    try {
      const res = await fetch(`/api/equipment/scan?qrCodeId=${qrCodeId}`);
      const data = await res.json();
      if (data.success && data.productId) {
        const item = equipment.find(e => e.id === data.productId);
        if (item) {
          showEditView(item);
          setIsGlobalScannerOpen(false);
        } else {
          alert("Équipement correspondant introuvable dans la liste locale.");
        }
      } else {
        alert(data.error || 'Exemplaire non trouvé.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue lors de la recherche.');
    }
  };

  // CRUD Equipment Handlers
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name || !brand || !cat || !desc) {
      setFormError('Veuillez remplir les champs obligatoires.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          brand,
          cat,
          desc,
          specs: specs,
          priceType,
          priceTax,
          price: priceType === 'numeric' ? Number(price) : 0,
          purchasePrice: Number(purchasePrice) || 0,
          items: Array.from({ length: newItemsCount }, (_, i) => ({
            qrCodeId: newItemsQrCodes[i] || null,
          })),
          image: image || null,
        })
      });
      const data = await res.json();
      if (data.success) {
        showListView();
        fetchEquipment();
      } else {
        setFormError(data.error || 'Une erreur est survenue.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!editingItem) return;

    if (!name || !brand || !cat || !desc) {
      setFormError('Veuillez remplir les champs obligatoires.');
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch(`/api/equipment/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          brand,
          cat,
          desc,
          specs: specs,
          priceType,
          priceTax,
          price: priceType === 'numeric' ? Number(price) : 0,
          purchasePrice: Number(purchasePrice) || 0,
          image: image || null,
        })
      });
      const data = await res.json();
      if (data.success) {
        showListView();
        fetchEquipment();
      } else {
        setFormError(data.error || 'Une erreur est survenue.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Une erreur est survenue.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet équipement du catalogue ?')) {
      return;
    }

    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchEquipment();
      } else {
        alert(data.error || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    }
  };

  // CRUD Category Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    const label = newCategoryLabel.trim();
    if (!label) return;

    setCategoryLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryLabel('');
        fetchCategories();
      } else {
        setCategoryError(data.error || 'Erreur lors de la création de la catégorie.');
      }
    } catch (err: any) {
      setCategoryError(err.message || 'Une erreur est survenue.');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Tous les équipements associés resteront mais la catégorie de filtre sera retirée.')) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      console.error(e);
      alert('Une erreur est survenue.');
    }
  };

  if (isPending || !session || (session.user as any).role !== 'admin') {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-hanken-grotesk), sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 style={{ width: '32px', height: '32px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#6e6e73' }}>Validation des accès administrateur...</span>
        </div>
      </div>
    );
  }

  // Calculate profitability indicators
  const totalPurchaseValue = equipment.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
  const totalStockQuantity = equipment.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate average rental return rate
  const avgRentalRate = equipment.length > 0 
    ? Math.round((equipment.reduce((sum, item) => sum + item.price, 0) / equipment.length)) 
    : 0;

  // Filtered equipment list based on search query
  const filteredEquipment = equipment.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  });

  const catalogTotalPages = Math.max(1, Math.ceil(filteredEquipment.length / catalogPageSize));
  const catalogPageClamped = Math.min(catalogPage, catalogTotalPages);
  const paginatedEquipment = filteredEquipment.slice(
    (catalogPageClamped - 1) * catalogPageSize,
    catalogPageClamped * catalogPageSize
  );

  const adminLinks = [
    { label: 'Espace Location', href: '/location/catalogue' },
    { label: 'Espace Profil', href: '/profil' },
    { label: 'Accueil', href: '/' },
  ];

  return (
    <div style={{ backgroundColor: '#f5f5f7', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <Header subTitle="Administration" links={adminLinks} />

      {/* Main container */}
      <div style={{ flex: 1, maxWidth: '1180px', margin: '0 auto', width: '100%', padding: '40px clamp(20px, 4vw, 40px)' }}>
        
        {/* VIEW 1: MAIN LISTINGS VIEW */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Header and Add Button */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
              <div style={{ overflowX: 'auto', scrollbarWidth: 'none', maxWidth: '100%' }}>
              <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e8e8ed', padding: '4px', borderRadius: '980px', width: 'max-content' }}>
                <button
                  onClick={() => setActiveTab('catalogue')}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '980px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'all .2s',
                    backgroundColor: activeTab === 'catalogue' ? '#ffffff' : 'transparent',
                    color: '#1d1d1f',
                    boxShadow: activeTab === 'catalogue' ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
                  }}
                >
                  Gestion Catalogue
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '980px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'all .2s',
                    backgroundColor: activeTab === 'categories' ? '#ffffff' : 'transparent',
                    color: '#1d1d1f',
                    boxShadow: activeTab === 'categories' ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
                  }}
                >
                  Catégories Dyn.
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '980px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'all .2s',
                    backgroundColor: activeTab === 'users' ? '#ffffff' : 'transparent',
                    color: '#1d1d1f',
                    boxShadow: activeTab === 'users' ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
                  }}
                >
                  Comptes Utilisateurs
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '980px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'all .2s',
                    backgroundColor: activeTab === 'settings' ? '#ffffff' : 'transparent',
                    color: '#1d1d1f',
                    boxShadow: activeTab === 'settings' ? '0 2px 8px rgba(0,0,0,.08)' : 'none'
                  }}
                >
                  Paramètres &amp; TVA
                </button>
                <button
                  onClick={() => setActiveTab('quotes')}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '980px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'all .2s',
                    backgroundColor: activeTab === 'quotes' ? '#ffffff' : 'transparent',
                    color: '#1d1d1f',
                    boxShadow: activeTab === 'quotes' ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Comptabilité
                  {adminQuotes.filter(q => q.status === 'pending').length > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#0071e3', color: '#fff', padding: '1px 6px', borderRadius: '980px' }}>
                      {adminQuotes.filter(q => q.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>
              </div>

              {activeTab === 'catalogue' && (
                <button
                  onClick={showAddView}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    borderRadius: '980px',
                    backgroundColor: '#0071e3',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'background-color .2s'
                  }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} /> Ajouter un matériel
                </button>
              )}
            </div>

            {/* TAB: CATALOGUE */}
            {activeTab === 'catalogue' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Financial ROI Dashboard */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: '#e8f1fd', color: '#0071e3' }}>
                      <DollarSign style={{ width: '24px', height: '24px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', marginBottom: '4px' }}>Valeur totale du parc</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{totalPurchaseValue.toLocaleString('fr-FR')} €</div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: '#e2fbe8', color: '#1db954' }}>
                      <TrendingUp style={{ width: '24px', height: '24px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', marginBottom: '4px' }}>Rendement moyen location</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{avgRentalRate} € / jour</div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: '#f5f5f7', color: '#1d1d1f' }}>
                      <BarChart3 style={{ width: '24px', height: '24px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', marginBottom: '4px' }}>Volume matériel stock</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{totalStockQuantity} unités</div>
                    </div>
                  </div>
                </div>

                {/* Catalogue Listing */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(0,0,0,.06)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Catalogue de Location</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="Rechercher un matériel (nom, marque, description, ID)..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCatalogPage(1); }}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '980px',
                          border: '1px solid rgba(0,0,0,.12)',
                          outline: 'none',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          width: '320px',
                          backgroundColor: '#f5f5f7',
                          transition: 'border-color .2s, background-color .2s'
                        }}
                        onFocus={e => {
                          e.currentTarget.style.borderColor = '#0071e3';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,.12)';
                          e.currentTarget.style.backgroundColor = '#f5f5f7';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsGlobalScannerOpen(true)}
                        title="Rechercher par QR Code"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px 16px',
                          borderRadius: '980px',
                          border: '1px solid rgba(0,0,0,.12)',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          color: '#1d1d1f',
                          transition: 'all 0.2s',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#0071e3';
                          e.currentTarget.style.color = '#0071e3';
                          e.currentTarget.style.backgroundColor = 'rgba(0,113,227,0.04)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,.12)';
                          e.currentTarget.style.color = '#1d1d1f';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        <QrCode style={{ width: '16px', height: '16px' }} />
                        Scanner
                      </button>
                    </div>
                  </div>

                  {loadingEquipment ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
                      <Loader2 style={{ width: '32px', height: '32px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : equipment.length > 0 ? (
                    filteredEquipment.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(0,0,0,.06)', backgroundColor: '#f5f5f7', fontSize: '11px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                              <th style={{ padding: '16px 30px' }}>Matériel</th>
                              <th style={{ padding: '16px 30px' }}>Catégorie</th>
                              <th style={{ padding: '16px 30px' }}>Quantité</th>
                              <th style={{ padding: '16px 30px' }}>Tarif Location / jour</th>
                              <th style={{ padding: '16px 30px' }}>Coût Achat</th>
                              <th style={{ padding: '16px 30px' }}>Seuil ROI (Jours)</th>
                              <th style={{ padding: '16px 30px', textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody style={{ fontSize: '14px', color: '#1d1d1f' }}>
                            {paginatedEquipment.map((item, idx) => {
                              const isRequest = item.priceType === 'on_request';
                              const roiDays = !isRequest && item.price > 0 ? Math.ceil(item.purchasePrice / item.price) : 0;
                              let roiHealth = 'N/A';
                              let roiColor = '#86868b';
                              let roiBg = '#f5f5f7';

                              if (!isRequest && roiDays > 0) {
                                if (roiDays > 20) {
                                  roiHealth = 'Basse';
                                  roiColor = '#ef4444';
                                  roiBg = '#fef2f2';
                                } else if (roiDays > 12) {
                                  roiHealth = 'Bonne';
                                  roiColor = '#0071e3';
                                  roiBg = '#e8f1fd';
                                } else {
                                  roiHealth = 'Excellente';
                                  roiColor = '#1db954';
                                  roiBg = '#e2fbe8';
                                }
                              }

                              return (
                                <tr key={item.id} style={{ borderBottom: idx < paginatedEquipment.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                  <td style={{ padding: '18px 30px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      {item.image && (
                                        <img src={item.image} alt={item.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(0,0,0,.06)' }} />
                                      )}
                                      <div>
                                        <div style={{ fontWeight: 700 }}>{item.name}</div>
                                        <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>{item.brand}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '18px 30px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6e6e73', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                                      {categories.find(c => c.id === item.cat)?.label || item.catLabel}
                                    </span>
                                  </td>
                                  <td style={{ padding: '18px 30px', fontWeight: 600 }}>
                                    {item.quantity}
                                  </td>
                                  <td style={{ padding: '18px 30px', fontWeight: 700 }}>
                                    {isRequest ? (
                                      <span style={{ color: '#0071e3' }}>Sur devis</span>
                                    ) : (
                                      <span>{item.price} € <span style={{ fontSize: '10px', color: '#86868b', fontWeight: 500 }}>{item.priceTax || 'HT'}</span></span>
                                    )}
                                  </td>
                                  <td style={{ padding: '18px 30px', fontWeight: 600, color: '#86868b' }}>
                                    {item.purchasePrice} €
                                  </td>
                                  <td style={{ padding: '18px 30px' }}>
                                    {isRequest ? (
                                      <span style={{ fontSize: '12px', color: '#86868b' }}>-</span>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700 }}>{roiDays} j</span>
                                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '980px', color: roiColor, backgroundColor: roiBg }}>
                                          {roiHealth}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '18px 30px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                      <button
                                        onClick={() => showEditView(item)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#0071e3', borderRadius: '8px', transition: 'background .15s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e8f1fd'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                      >
                                        <Edit2 style={{ width: '16px', height: '16px' }} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#ef4444', borderRadius: '8px', transition: 'background .15s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                      >
                                        <Trash2 style={{ width: '16px', height: '16px' }} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '50px 20px', color: '#86868b' }}>
                        Aucun matériel ne correspond à votre recherche.
                      </div>
                    )
                  ) : (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#86868b' }}>
                      Aucun matériel dans le catalogue. Cliquez sur "Ajouter un matériel".
                    </div>
                  )}

                  {/* Pagination controls */}
                  {filteredEquipment.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 30px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6e73' }}>
                        <span>Afficher</span>
                        <select
                          value={catalogPageSize}
                          onChange={e => { setCatalogPageSize(Number(e.target.value)); setCatalogPage(1); }}
                          style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit', backgroundColor: '#fff', cursor: 'pointer' }}
                        >
                          {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span>par page — {filteredEquipment.length} résultat{filteredEquipment.length > 1 ? 's' : ''}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
                          disabled={catalogPageClamped <= 1}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,.12)', backgroundColor: catalogPageClamped <= 1 ? '#f5f5f7' : '#fff', color: catalogPageClamped <= 1 ? '#b0b0b5' : '#1d1d1f', cursor: catalogPageClamped <= 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}
                        >
                          ← Précédent
                        </button>

                        {Array.from({ length: catalogTotalPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => setCatalogPage(p)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${p === catalogPageClamped ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`, backgroundColor: p === catalogPageClamped ? '#1d1d1f' : '#fff', color: p === catalogPageClamped ? '#fff' : '#1d1d1f', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', display: catalogTotalPages > 7 && p !== 1 && p !== catalogTotalPages && Math.abs(p - catalogPageClamped) > 2 ? 'none' : 'inline-flex' }}
                          >
                            {p}
                          </button>
                        ))}

                        <button
                          onClick={() => setCatalogPage(p => Math.min(catalogTotalPages, p + 1))}
                          disabled={catalogPageClamped >= catalogTotalPages}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,.12)', backgroundColor: catalogPageClamped >= catalogTotalPages ? '#f5f5f7' : '#fff', color: catalogPageClamped >= catalogTotalPages ? '#b0b0b5' : '#1d1d1f', cursor: catalogPageClamped >= catalogTotalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}
                        >
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: CATEGORIES */}
            {activeTab === 'categories' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
                
                {/* Add Category Form */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag style={{ width: '20px', height: '20px', color: '#0071e3' }} /> Créer une catégorie
                  </h3>
                  
                  <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {categoryError && (
                      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                        {categoryError}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Nom de la catégorie *</label>
                      <input
                        type="text"
                        placeholder="ex: Écrans LED"
                        value={newCategoryLabel}
                        onChange={e => setNewCategoryLabel(e.target.value)}
                        style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={categoryLoading}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '980px',
                        backgroundColor: '#1d1d1f',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                    >
                      {categoryLoading ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : 'Ajouter la catégorie'}
                    </button>
                  </form>
                </div>

                {/* Categories List */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <div style={{ padding: '20px 30px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Catégories Actives</h3>
                  </div>

                  {loadingCategories ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                      <Loader2 style={{ width: '24px', height: '24px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : categories.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {categories.map((c, idx) => (
                        <div
                          key={c.id}
                          style={{
                            padding: '16px 30px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: idx < categories.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.label}</div>
                            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px', fontFamily: 'monospace' }}>slug: {c.id}</div>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                              color: '#ef4444',
                              borderRadius: '8px',
                              transition: 'background .15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Trash2 style={{ width: '16px', height: '16px' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#86868b' }}>
                      Aucune catégorie trouvée.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: USERS */}
            {activeTab === 'users' && (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Comptes Utilisateurs Inscrits</h3>
                </div>

                {loadingUsers ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
                    <Loader2 style={{ width: '32px', height: '32px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : users.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,.06)', backgroundColor: '#f5f5f7', fontSize: '11px', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          <th style={{ padding: '16px 30px' }}>Nom / ID</th>
                          <th style={{ padding: '16px 30px' }}>Email</th>
                          <th style={{ padding: '16px 30px' }}>Rôle</th>
                          <th style={{ padding: '16px 30px' }}>Date d'inscription</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '14px', color: '#1d1d1f' }}>
                        {users.map((u, idx) => (
                          <tr key={u.id} style={{ borderBottom: idx < users.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                            <td style={{ padding: '18px 30px' }}>
                              <div style={{ fontWeight: 700 }}>{u.name}</div>
                              <div style={{ fontSize: '10px', color: '#86868b', fontFamily: 'monospace', marginTop: '2px' }}>{u.id}</div>
                            </td>
                            <td style={{ padding: '18px 30px', userSelect: 'all' }}>
                              {u.email}
                            </td>
                            <td style={{ padding: '18px 30px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '980px',
                                fontSize: '12px',
                                fontWeight: 700,
                                backgroundColor: u.role === 'admin' ? '#fef2f2' : '#e8f1fd',
                                color: u.role === 'admin' ? '#ef4444' : '#0071e3',
                                border: `1px solid ${u.role === 'admin' ? '#fee2e2' : '#d0e3ff'}`
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: u.role === 'admin' ? '#ef4444' : '#0071e3' }}></span>
                                {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                              </span>
                            </td>
                            <td style={{ padding: '18px 30px', fontSize: '13px', color: '#6e6e73' }}>
                              {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: '#86868b' }}>
                    Aucun compte utilisateur inscrit.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders style={{ width: '20px', height: '20px', color: '#0071e3' }} /> Configuration Globale &amp; TVA
                </h3>

                <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {settingsMessage && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
                      {settingsMessage}
                    </div>
                  )}
                  {settingsError && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                      {settingsError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Taux de TVA (%) *</label>
                    <input
                      type="number"
                      placeholder="20"
                      value={adminTva}
                      onChange={e => setAdminTva(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                      required
                    />
                    <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#86868b', lineHeight: 1.4 }}>
                      Ce taux sera appliqué sur l'ensemble du catalogue pour convertir les prix HT et TTC, ainsi que pour les calculs de devis.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Coefficient Weekend (2 jours) *</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="1.4"
                      value={adminCoeffWeekend}
                      onChange={e => setAdminCoeffWeekend(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                      required
                    />
                    <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#86868b', lineHeight: 1.4 }}>
                      Appliqué pour une location d'exactement 2 jours (ex: 1.4x le prix journalier).
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Coefficient 3 jours *</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder="1.8"
                      value={adminCoeff3Jours}
                      onChange={e => setAdminCoeff3Jours(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                      required
                    />
                    <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#86868b', lineHeight: 1.4 }}>
                      Appliqué pour une location d'exactement 3 jours.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Coefficient Semaine (7 jours) *</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="3.0"
                      value={adminCoeffSemaine}
                      onChange={e => setAdminCoeffSemaine(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                      required
                    />
                    <p style={{ margin: '4px 0 12px', fontSize: '12px', color: '#86868b', lineHeight: 1.4 }}>
                      Base de calcul hebdomadaire (ex: louer 7 jours équivaut à 3 jours de tarif journalier standard).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={settingsLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '980px',
                      backgroundColor: '#1d1d1f',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '6px'
                    }}
                  >
                    {settingsLoading ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : 'Enregistrer les paramètres'}
                  </button>
                </form>
              </div>

              {/* Coordonnées bancaires */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard style={{ width: '20px', height: '20px', color: '#0071e3' }} /> Coordonnées Bancaires
                </h3>
                <form onSubmit={handleUpdatePaymentSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {paymentMessage && (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
                      {paymentMessage}
                    </div>
                  )}
                  {paymentError && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                      {paymentError}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>IBAN</label>
                    <input type="text" placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" value={adminIban} onChange={e => setAdminIban(e.target.value)} style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>BIC / SWIFT</label>
                    <input type="text" placeholder="BNPAFRPP" value={adminBic} onChange={e => setAdminBic(e.target.value)} style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Instructions de paiement</label>
                    <textarea rows={3} placeholder="Ex : Virement bancaire à effectuer sous 30 jours à réception de la facture." value={adminPaymentInstructions} onChange={e => setAdminPaymentInstructions(e.target.value)} style={{ padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }} />
                  </div>
                  <button type="submit" disabled={paymentLoading} style={{ width: '100%', padding: '12px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                    {paymentLoading ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : 'Enregistrer les coordonnées'}
                  </button>
                </form>
              </div>
            </div>
            )}

            {activeTab === 'quotes' && (() => {
              // Group all quotes by client
              const clientGroups: Record<string, { userId: string; userName: string; userEmail: string; quotes: any[] }> = {};
              adminQuotes.forEach(q => {
                if (!clientGroups[q.userId]) {
                  clientGroups[q.userId] = { userId: q.userId, userName: q.userName, userEmail: q.userEmail, quotes: [] };
                }
                clientGroups[q.userId].quotes.push(q);
              });
              const clientList = Object.values(clientGroups)
                .filter(g => clientSearch === '' ||
                  g.userName.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  g.userEmail.toLowerCase().includes(clientSearch.toLowerCase()))
                .sort((a, b) => {
                  // Sort: clients with active docs first
                  const aActive = a.quotes.filter(q => ['pending', 'modified_by_admin', 'pdf_pending'].includes(q.status)).length;
                  const bActive = b.quotes.filter(q => ['pending', 'modified_by_admin', 'pdf_pending'].includes(q.status)).length;
                  return bActive - aActive;
                });

              return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Dossiers Clients</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6e6e73' }}>{Object.keys(clientGroups).length} client{Object.keys(clientGroups).length > 1 ? 's' : ''} · {adminQuotes.filter(q => q.status === 'pending').length} demande{adminQuotes.filter(q => q.status === 'pending').length > 1 ? 's' : ''} en attente</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    style={{ padding: '8px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit', width: '240px', backgroundColor: '#f5f5f7' }}
                  />
                </div>

                {loadingQuotes ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 style={{ width: '32px', height: '32px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : clientList.length === 0 ? (
                  <div style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '50px 20px', textAlign: 'center', color: '#86868b', fontSize: '14px' }}>
                    {adminQuotes.length === 0 ? 'Aucun dossier client pour le moment.' : 'Aucun client ne correspond à la recherche.'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {clientList.map(group => {
                      const pending = group.quotes.filter(q => q.status === 'pending').length;
                      const modified = group.quotes.filter(q => q.status === 'modified_by_admin').length;
                      const pdfPending = group.quotes.filter(q => q.status === 'pdf_pending').length;
                      const validated = group.quotes.filter(q => q.status === 'validated').length;
                      const cancelled = group.quotes.filter(q => q.status === 'cancelled').length;
                      const activeCount = pending + modified + pdfPending;
                      const lastQuote = group.quotes[0];
                      const hasUrgent = pending > 0 || modified > 0;

                      return (
                        <Link
                          key={group.userId}
                          href={`/admin/client/${group.userId}`}
                          style={{ textDecoration: 'none', display: 'block' }}
                        >
                          <div style={{
                            backgroundColor: '#fff',
                            border: `1px solid ${hasUrgent ? 'rgba(0,113,227,.3)' : 'rgba(0,0,0,.08)'}`,
                            borderRadius: '20px',
                            padding: '22px 24px',
                            boxShadow: hasUrgent ? '0 4px 20px rgba(0,113,227,.06)' : '0 4px 20px rgba(0,0,0,.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            transition: 'transform .15s, box-shadow .15s',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,.08)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = hasUrgent ? '0 4px 20px rgba(0,113,227,.06)' : '0 4px 20px rgba(0,0,0,.02)'; }}
                          >
                            {/* Client header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, flexShrink: 0 }}>
                                {group.userName.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.userName}</div>
                                <div style={{ fontSize: '12px', color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.userEmail}</div>
                              </div>
                              {activeCount > 0 && (
                                <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#0071e3', color: '#fff', padding: '3px 8px', borderRadius: '980px', flexShrink: 0 }}>
                                  {activeCount} actif{activeCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            {/* Status badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {pending > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', backgroundColor: '#fff3cd', color: '#856404' }}>{pending} en attente</span>}
                              {modified > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', backgroundColor: '#e8f1fd', color: '#0071e3' }}>{modified} modifié{modified > 1 ? 's' : ''}</span>}
                              {pdfPending > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', backgroundColor: '#f0fdf4', color: '#15803d' }}>{pdfPending} PDF requis</span>}
                              {validated > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', backgroundColor: '#f5f5f7', color: '#6e6e73' }}>{validated} validé{validated > 1 ? 's' : ''}</span>}
                              {cancelled > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', backgroundColor: '#fef2f2', color: '#ef4444' }}>{cancelled} annulé{cancelled > 1 ? 's' : ''}</span>}
                              {group.quotes.length === 0 && <span style={{ fontSize: '11px', color: '#86868b' }}>Aucun document</span>}
                            </div>

                            {/* Last activity */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,.05)', paddingTop: '12px', fontSize: '12px', color: '#86868b' }}>
                              <span>Dernier doc : {lastQuote ? new Date(lastQuote.updatedAt).toLocaleDateString('fr-FR') : '—'}</span>
                              <span style={{ color: '#0071e3', fontWeight: 600 }}>Ouvrir le dossier →</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Processed quotes archive */}
                {!loadingQuotes && adminQuotes.filter(q => q.status !== 'pending' && q.status !== 'draft' && q.status !== 'modified_by_admin' && q.status !== 'pdf_pending').length > 0 && (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '24px 30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px', color: '#6e6e73' }}>Historique des Devis Traités</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,.06)', backgroundColor: '#f5f5f7', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          <th style={{ padding: '12px 20px' }}>ID / Client</th>
                          <th style={{ padding: '12px 20px' }}>Période</th>
                          <th style={{ padding: '12px 20px' }}>Total HT</th>
                          <th style={{ padding: '12px 20px' }}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminQuotes.filter(q => q.status !== 'pending' && q.status !== 'draft' && q.status !== 'modified_by_admin' && q.status !== 'pdf_pending').map((q) => (
                          <tr key={q.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ fontWeight: 700 }}>{q.id}</div>
                              <div style={{ fontSize: '11px', color: '#86868b' }}>{q.userName}</div>
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: '12px', color: '#6e6e73' }}>
                              {new Date(q.startDate).toLocaleDateString('fr-FR')} → {new Date(q.endDate).toLocaleDateString('fr-FR')}
                            </td>
                            <td style={{ padding: '14px 20px', fontWeight: 700 }}>{q.totalHT.toLocaleString('fr-FR')} €</td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '980px', backgroundColor: q.status === 'validated' ? '#e2fbe8' : '#fef2f2', color: q.status === 'validated' ? '#1db954' : '#ef4444' }}>
                                {q.status === 'validated' ? 'Validé' : 'Annulé'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </div>
              );
            })()}

          </div>
        )}

        {/* VIEW 2: DEDICATED ADD VIEW */}
        {view === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={showListView} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', color: '#86868b', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft style={{ width: '20px', height: '20px' }} /> Retour
              </button>
              <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-.025em' }}>Ajouter un équipement au catalogue</h2>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '40px 30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
              
              <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {formError && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Nom du modèle *</label>
                    <input type="text" placeholder="ex: Kara II" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Marque *</label>
                    <input type="text" placeholder="ex: L-Acoustics" value={brand} onChange={e => setBrand(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Catégorie * (Synchronisée avec le site)</label>
                  <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer' }} required>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Description *</label>
                  <textarea rows={4} placeholder="Présentation rapide et caractéristiques générales du matériel..." value={desc} onChange={e => setDesc(e.target.value)} style={{ padding: '16px', borderRadius: '18px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }} required />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Caractéristiques techniques (Spécifications)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ajouter une caractéristique (ex: SPL max 142dB, 3 réglages de base...)"
                      value={newSpecText}
                      onChange={e => setNewSpecText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSpec();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        borderRadius: '980px',
                        border: '1px solid rgba(0,0,0,.12)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '980px',
                        backgroundColor: '#1d1d1f',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0071e3'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d1d1f'}
                    >
                      Ajouter
                    </button>
                  </div>
                  {specs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)' }}>
                      {specs.map((spec, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid rgba(0,0,0,0.08)',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1d1d1f'
                          }}
                        >
                          {spec}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(index)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: '#86868b'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#86868b'}
                          >
                            <X style={{ width: '14px', height: '14px' }} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Image de l'équipement (URL ou fichier)</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Coller l'URL de l'image ou utiliser le bouton à droite..."
                      value={image.startsWith('data:') ? 'Image chargée depuis un fichier local' : image}
                      disabled={image.startsWith('data:')}
                      onChange={e => setImage(e.target.value)}
                      style={{ flex: 1, padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      id="equipment-image-file-add"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="equipment-image-file-add"
                      style={{
                        padding: '12px 20px',
                        borderRadius: '980px',
                        backgroundColor: '#1d1d1f',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0071e3'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d1d1f'}
                    >
                      Choisir un fichier
                    </label>
                    {image && (
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '980px',
                          backgroundColor: '#f5f5f7',
                          color: '#ef4444',
                          border: '1px solid #fee2e2',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Effacer l'image
                      </button>
                    )}
                  </div>
                  {image && (
                    <div style={{ marginTop: '10px', position: 'relative', width: '120px', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,.08)' }}>
                      <img src={image} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>

                {/* Price structure settings */}
                <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: '18px', padding: '24px', backgroundColor: '#f5f5f7', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Tarification &amp; Rentabilité</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Type de Tarif *</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setPriceType('numeric')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceType === 'numeric' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceType === 'numeric' ? '#1d1d1f' : '#fff',
                            color: priceType === 'numeric' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all .2s'
                          }}
                        >
                          Prix Fixe
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriceType('on_request')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceType === 'on_request' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceType === 'on_request' ? '#1d1d1f' : '#fff',
                            color: priceType === 'on_request' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all .2s'
                          }}
                        >
                          Sur devis
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Régime de taxe (Loc.)</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          disabled={priceType === 'on_request'}
                          onClick={() => setPriceTax('HT')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceTax === 'HT' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceTax === 'HT' ? '#1d1d1f' : '#fff',
                            color: priceTax === 'HT' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: priceType === 'on_request' ? 'not-allowed' : 'pointer',
                            opacity: priceType === 'on_request' ? 0.5 : 1,
                            transition: 'all .2s'
                          }}
                        >
                          HT (Hors Taxe)
                        </button>
                        <button
                          type="button"
                          disabled={priceType === 'on_request'}
                          onClick={() => setPriceTax('TTC')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceTax === 'TTC' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceTax === 'TTC' ? '#1d1d1f' : '#fff',
                            color: priceTax === 'TTC' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: priceType === 'on_request' ? 'not-allowed' : 'pointer',
                            opacity: priceType === 'on_request' ? 0.5 : 1,
                            transition: 'all .2s'
                          }}
                        >
                          TTC
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Prix Loc / jour (€) *</label>
                      <input
                        type="number"
                        placeholder={priceType === 'on_request' ? 'N/A (Sur devis)' : '150'}
                        disabled={priceType === 'on_request'}
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', backgroundColor: priceType === 'on_request' ? '#e8e8ed' : '#fff' }}
                        required={priceType === 'numeric'}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Prix d'Achat (€) * (Privé)</label>
                      <input type="number" placeholder="2200" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                    </div>
                  </div>
                </div>

                  {/* Exemplaires physiques */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Exemplaires Physiques</h4>
                        <p style={{ fontSize: '12px', color: '#86868b', margin: '4px 0 0' }}>Chaque exemplaire ajouté compte pour 1 unité. Les QR Codes pourront être assignés après la création.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewItemsCount(c => c + 1)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        <Plus style={{ width: '14px', height: '14px' }} />
                        Ajouter un exemplaire
                      </button>
                    </div>

                    {newItemsCount === 0 ? (
                      <div style={{ padding: '24px', borderRadius: '18px', border: '1px dashed rgba(0,0,0,.15)', textAlign: 'center', color: '#86868b', fontSize: '14px' }}>
                        Aucun exemplaire ajouté. Cliquez sur le bouton pour en ajouter.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Array.from({ length: newItemsCount }, (_, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: '16px', backgroundColor: '#f5f5f7', border: '1px solid rgba(0,0,0,.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{name || 'Nouveau produit'} {i + 1}</span>
                              {newItemsQrCodes[i] ? (
                                <span style={{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 10px', borderRadius: '980px', backgroundColor: 'rgba(52,199,89,.12)', color: '#1a8a3a', fontWeight: 600 }}>
                                  QR: {newItemsQrCodes[i]}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setScanningNewItemIndex(i); setIsLocalScannerOpen(true); }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,149,0,.1)', color: '#e08000', fontWeight: 600, border: '1px solid rgba(255,149,0,.3)', cursor: 'pointer' }}
                                >
                                  <Camera style={{ width: '12px', height: '12px' }} />
                                  Scanner QR
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {newItemsQrCodes[i] && (
                                <button
                                  type="button"
                                  onClick={() => setNewItemsQrCodes(prev => { const n = { ...prev }; delete n[i]; return n; })}
                                  style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '980px', backgroundColor: 'transparent', color: '#86868b', border: '1px solid rgba(0,0,0,.12)', cursor: 'pointer' }}
                                >
                                  Changer QR
                                </button>
                              )}
                              {i === newItemsCount - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewItemsCount(c => c - 1);
                                    setNewItemsQrCodes(prev => { const n = { ...prev }; delete n[newItemsCount - 1]; return n; });
                                  }}
                                  style={{ padding: '6px 14px', borderRadius: '980px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fee2e2', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Retirer
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={formLoading}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '980px',
                      backgroundColor: '#0071e3',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {formLoading ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : 'Ajouter l\'équipement'}
                  </button>
                  <button
                    type="button"
                    onClick={showListView}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '980px',
                      backgroundColor: 'transparent',
                      color: '#6e6e73',
                      border: '1px solid rgba(0,0,0,.12)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '15px'
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* VIEW 3: DEDICATED EDIT VIEW */}
        {view === 'edit' && editingItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={showListView} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px', color: '#86868b', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft style={{ width: '20px', height: '20px' }} /> Retour
              </button>
              <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-.025em' }}>Modifier l'équipement: {editingItem.name}</h2>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '40px 30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
              
              <form onSubmit={handleEditItem} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {formError && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Nom du modèle *</label>
                    <input type="text" placeholder="ex: Kara II" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Marque *</label>
                    <input type="text" placeholder="ex: L-Acoustics" value={brand} onChange={e => setBrand(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Catégorie * (Synchronisée avec le site)</label>
                  <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer' }} required>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Description *</label>
                  <textarea rows={4} placeholder="Présentation rapide et caractéristiques générales du matériel..." value={desc} onChange={e => setDesc(e.target.value)} style={{ padding: '16px', borderRadius: '18px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }} required />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Caractéristiques techniques (Spécifications)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ajouter une caractéristique (ex: SPL max 142dB, 3 réglages de base...)"
                      value={newSpecText}
                      onChange={e => setNewSpecText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSpec();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        borderRadius: '980px',
                        border: '1px solid rgba(0,0,0,.12)',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '980px',
                        backgroundColor: '#1d1d1f',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0071e3'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d1d1f'}
                    >
                      Ajouter
                    </button>
                  </div>
                  {specs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)' }}>
                      {specs.map((spec, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid rgba(0,0,0,0.08)',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1d1d1f'
                          }}
                        >
                          {spec}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(index)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: '#86868b'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#86868b'}
                          >
                            <X style={{ width: '14px', height: '14px' }} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Image de l'équipement (URL ou fichier)</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Coller l'URL de l'image ou utiliser le bouton à droite..."
                      value={image.startsWith('data:') ? 'Image chargée depuis un fichier local' : image}
                      disabled={image.startsWith('data:')}
                      onChange={e => setImage(e.target.value)}
                      style={{ flex: 1, padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      id="equipment-image-file-edit"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="equipment-image-file-edit"
                      style={{
                        padding: '12px 20px',
                        borderRadius: '980px',
                        backgroundColor: '#1d1d1f',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0071e3'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d1d1f'}
                    >
                      Choisir un fichier
                    </label>
                    {image && (
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '980px',
                          backgroundColor: '#f5f5f7',
                          color: '#ef4444',
                          border: '1px solid #fee2e2',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Effacer l'image
                      </button>
                    )}
                  </div>
                  {image && (
                    <div style={{ marginTop: '10px', position: 'relative', width: '120px', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,.08)' }}>
                      <img src={image} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>

                {/* Price structure settings */}
                <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: '18px', padding: '24px', backgroundColor: '#f5f5f7', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Tarification &amp; Rentabilité</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Type de Tarif *</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setPriceType('numeric')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceType === 'numeric' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceType === 'numeric' ? '#1d1d1f' : '#fff',
                            color: priceType === 'numeric' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all .2s'
                          }}
                        >
                          Prix Fixe
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriceType('on_request')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceType === 'on_request' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceType === 'on_request' ? '#1d1d1f' : '#fff',
                            color: priceType === 'on_request' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all .2s'
                          }}
                        >
                          Sur devis
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Régime de taxe (Loc.)</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          disabled={priceType === 'on_request'}
                          onClick={() => setPriceTax('HT')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceTax === 'HT' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceTax === 'HT' ? '#1d1d1f' : '#fff',
                            color: priceTax === 'HT' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: priceType === 'on_request' ? 'not-allowed' : 'pointer',
                            opacity: priceType === 'on_request' ? 0.5 : 1,
                            transition: 'all .2s'
                          }}
                        >
                          HT (Hors Taxe)
                        </button>
                        <button
                          type="button"
                          disabled={priceType === 'on_request'}
                          onClick={() => setPriceTax('TTC')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '980px',
                            border: `1px solid ${priceTax === 'TTC' ? '#1d1d1f' : 'rgba(0,0,0,.12)'}`,
                            backgroundColor: priceTax === 'TTC' ? '#1d1d1f' : '#fff',
                            color: priceTax === 'TTC' ? '#fff' : '#1d1d1f',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: priceType === 'on_request' ? 'not-allowed' : 'pointer',
                            opacity: priceType === 'on_request' ? 0.5 : 1,
                            transition: 'all .2s'
                          }}
                        >
                          TTC
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Prix Loc / jour (€) *</label>
                      <input
                        type="number"
                        placeholder={priceType === 'on_request' ? 'N/A (Sur devis)' : '150'}
                        disabled={priceType === 'on_request'}
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px', backgroundColor: priceType === 'on_request' ? '#e8e8ed' : '#fff' }}
                        required={priceType === 'numeric'}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Prix d'Achat (€) * (Privé)</label>
                      <input type="number" placeholder="2200" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Quantité stock (Calculée)</label>
                      <div style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.08)', backgroundColor: '#f5f5f7', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', height: '100%', minHeight: '41px' }}>
                        {editingItems.filter(item => item.status !== 'MAINTENANCE').length} actif(s) / {editingItems.length} total
                      </div>
                    </div>
                  </div>

                  {/* Section Exemplaires Physiques (Assets) */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Exemplaires Physiques (Assets)</h4>
                        <p style={{ fontSize: '12px', color: '#86868b', margin: '4px 0 0' }}>Chaque exemplaire possède un QR Code unique pour le suivi du stock.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLocalScannerOpen(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          borderRadius: '980px',
                          backgroundColor: '#1d1d1f',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#000000'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1d1d1f'}
                      >
                        <Camera style={{ width: '15px', height: '15px' }} />
                        Scanner & Ajouter
                      </button>
                    </div>

                    {loadingItems ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86868b', fontSize: '14px', padding: '12px' }}>
                        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Chargement des exemplaires...
                      </div>
                    ) : editingItems.length === 0 ? (
                      <div style={{ padding: '24px', borderRadius: '18px', border: '1px dashed rgba(0,0,0,.15)', textAlign: 'center', color: '#86868b', fontSize: '14px' }}>
                        Aucun exemplaire physique enregistré pour cet équipement.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {editingItems.map((item) => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: '16px', backgroundColor: '#f5f5f7', border: '1px solid rgba(0,0,0,.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.itemName}</span>
                              {item.qrCodeId ? (
                                <span style={{ fontSize: '12px', fontFamily: 'monospace', padding: '4px 10px', borderRadius: '980px', backgroundColor: 'rgba(0,0,0,.06)', color: '#1d1d1f' }}>
                                  QR: {item.qrCodeId}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setAssigningQrToItemId(item.id); setIsLocalScannerOpen(true); }}
                                  style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '980px', backgroundColor: 'rgba(255,149,0,.1)', color: '#e08000', fontWeight: 600, border: '1px solid rgba(255,149,0,.3)', cursor: 'pointer' }}
                                >
                                  Assigner QR
                                </button>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <select
                                value={item.status}
                                onChange={e => handleUpdatePhysicalItemStatus(item.id, e.target.value)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '980px',
                                  border: '1px solid rgba(0,0,0,.12)',
                                  outline: 'none',
                                  fontSize: '13px',
                                  backgroundColor: '#fff',
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                <option value="AVAILABLE">Disponible</option>
                                <option value="RENTED">Loué</option>
                                <option value="MAINTENANCE">En maintenance</option>
                              </select>
                              
                              <button
                                type="button"
                                onClick={() => handleDeletePhysicalItem(item.id)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#ff453a',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,69,58,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Trash2 style={{ width: '16px', height: '16px' }} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={formLoading}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '980px',
                      backgroundColor: '#0071e3',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {formLoading ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : 'Mettre à jour l\'équipement'}
                  </button>
                  <button
                    type="button"
                    onClick={showListView}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '980px',
                      backgroundColor: 'transparent',
                      color: '#6e6e73',
                      border: '1px solid rgba(0,0,0,.12)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '15px'
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Local Scan Modal (Adding Physical Item or Assigning QR) */}
        <ScannerModal
          isOpen={isLocalScannerOpen}
          onClose={() => { setIsLocalScannerOpen(false); setAssigningQrToItemId(null); setScanningNewItemIndex(null); }}
          onScanSuccess={handleLocalScanSuccess}
          title={scanningNewItemIndex !== null ? 'Scanner le QR Code' : assigningQrToItemId ? 'Assigner un QR Code' : 'Enregistrer un exemplaire'}
        />

        {/* Global Scan Modal (Search/Redirect) */}
        <ScannerModal
          isOpen={isGlobalScannerOpen}
          onClose={() => setIsGlobalScannerOpen(false)}
          onScanSuccess={handleGlobalScanSuccess}
          title="Rechercher un produit par scan"
        />

      </div>

      <Footer />
    </div>
  );
}
