'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Loader2, Plus, Edit2, Trash2, Users, Sliders, DollarSign, TrendingUp, BarChart3, Info, ChevronLeft, Tag, FileText } from 'lucide-react';

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

  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);

  // Form states for Equipment
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cat, setCat] = useState('');
  const [desc, setDesc] = useState('');
  const [specsInput, setSpecsInput] = useState('');
  const [priceType, setPriceType] = useState<'numeric' | 'on_request'>('numeric');
  const [priceTax, setPriceTax] = useState<'HT' | 'TTC'>('HT');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('');
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

  // Security route guard
  useEffect(() => {
    if (!isPending && (!session || (session.user as any).role !== 'admin')) {
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

  const showListView = () => {
    setView('list');
    setEditingItem(null);
  };

  const showAddView = () => {
    setName('');
    setBrand('');
    setCat(categories.length > 0 ? categories[0].id : '');
    setDesc('');
    setSpecsInput('');
    setPriceType('numeric');
    setPriceTax('HT');
    setPrice('');
    setPurchasePrice('');
    setQuantity('1');
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
    setSpecsInput((item.specs || []).join(', '));
    setPriceType(item.priceType || 'numeric');
    setPriceTax(item.priceTax || 'HT');
    setPrice(String(item.price));
    setPurchasePrice(String(item.purchasePrice));
    setQuantity(String(item.quantity));
    setImage(item.image || '');
    setFormError('');
    setView('edit');
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
      const specsArray = specsInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          brand,
          cat,
          desc,
          specs: specsArray,
          priceType,
          priceTax,
          price: priceType === 'numeric' ? Number(price) : 0,
          purchasePrice: Number(purchasePrice) || 0,
          quantity: Number(quantity) || 1,
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
      const specsArray = specsInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/equipment/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          brand,
          cat,
          desc,
          specs: specsArray,
          priceType,
          priceTax,
          price: priceType === 'numeric' ? Number(price) : 0,
          purchasePrice: Number(purchasePrice) || 0,
          quantity: Number(quantity) || 1,
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
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e8e8ed', padding: '4px', borderRadius: '980px' }}>
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
                  Demandes de Devis
                  {adminQuotes.filter(q => q.status === 'pending').length > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#0071e3', color: '#fff', padding: '1px 6px', borderRadius: '980px' }}>
                      {adminQuotes.filter(q => q.status === 'pending').length}
                    </span>
                  )}
                </button>
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
                    <input
                      type="text"
                      placeholder="Rechercher un matériel (nom, marque, description, ID)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
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
                            {filteredEquipment.map((item, idx) => {
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
                                <tr key={item.id} style={{ borderBottom: idx < filteredEquipment.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
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
              <div style={{ maxWidth: '600px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
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
            )}

            {activeTab === 'quotes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>Demandes de Devis Client en Attente</h3>
                  <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6e6e73' }}>
                    Retrouvez ici toutes les demandes envoyées par vos clients et en cours d'évaluation.
                  </p>

                  {loadingQuotes ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                      <Loader2 style={{ width: '32px', height: '32px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : adminQuotes.filter(q => q.status === 'pending').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {adminQuotes.filter(q => q.status === 'pending').map((q) => {
                        const isEditing = editingQuoteId === q.id;

                        if (isEditing) {
                          const { totalHT: liveHT, totalTTC: liveTTC, duration: liveDur, coeff: liveCoeff } = calculateEditTotals();
                          return (
                            <form key={q.id} onSubmit={handleSaveEditedQuote} style={{ border: '2px solid #0071e3', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#fff', boxShadow: '0 4px 24px rgba(0,113,227,.06)' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#0071e3' }}>Modification du Devis #{q.id}</div>
                                  <div style={{ fontSize: '13px', color: '#86868b', marginTop: '2px' }}>
                                    Client : <strong>{q.userName}</strong> ({q.userEmail})
                                  </div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '980px', backgroundColor: '#e8f1fd', color: '#0071e3', textTransform: 'uppercase' }}>
                                  Mode Édition
                                </span>
                              </div>

                              {/* Form fields for dates and notes */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f' }}>Date de début</label>
                                  <input
                                    type="date"
                                    value={editStartDate}
                                    onChange={e => setEditStartDate(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit' }}
                                    required
                                  />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f' }}>Date de fin</label>
                                  <input
                                    type="date"
                                    value={editEndDate}
                                    onChange={e => setEditEndDate(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit' }}
                                    required
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f' }}>Notes / Remarques du Devis</label>
                                <textarea
                                  rows={2}
                                  value={editNotes}
                                  onChange={e => setEditNotes(e.target.value)}
                                  placeholder="Notes ou remarques du client / administrateur..."
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                                />
                              </div>

                              {/* Lignes de matériel */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f' }}>Lignes de Matériels :</span>
                                <div style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', overflow: 'hidden' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#f5f5f7', borderBottom: '1px solid rgba(0,0,0,.06)', fontWeight: 600 }}>
                                        <th style={{ padding: '10px 16px' }}>Matériel</th>
                                        <th style={{ padding: '10px 16px' }}>Quantité</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Tarif (HT)</th>
                                        <th style={{ padding: '10px 16px', width: '50px' }}></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {editItems.map((it: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: idx < editItems.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                          <td style={{ padding: '10px 16px' }}><strong>{it.brand}</strong> - {it.name}</td>
                                          <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <button type="button" onClick={() => handleUpdateEditItemQty(it.id, -1)} style={{ border: '1px solid #d1d1d6', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', fontWeight: 600 }}>-</button>
                                              <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{it.quantity}</span>
                                              <button type="button" onClick={() => handleUpdateEditItemQty(it.id, 1)} style={{ border: '1px solid #d1d1d6', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', fontWeight: 600 }}>+</button>
                                            </div>
                                          </td>
                                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                            {it.priceType === 'on_request' ? (
                                              <span style={{ color: '#86868b' }}>Sur devis</span>
                                            ) : (
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <input
                                                  type="number"
                                                  value={it.price}
                                                  onChange={e => handleUpdateEditItemPrice(it.id, Number(e.target.value))}
                                                  style={{ width: '75px', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,.15)', outline: 'none', textAlign: 'right', fontSize: '13px' }}
                                                  min="0"
                                                  step="0.01"
                                                />
                                                <span>€</span>
                                              </div>
                                            )}
                                          </td>
                                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <button type="button" onClick={() => handleRemoveEditItem(it.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                              <Trash2 style={{ width: '14px', height: '14px' }} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Add new line */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                  <select
                                    value={editAddItemSelect}
                                    onChange={e => setEditAddItemSelect(e.target.value)}
                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '13px' }}
                                  >
                                    <option value="">-- Choisir un matériel à rajouter --</option>
                                    {equipment.map(e => (
                                      <option key={e.id} value={e.id}>
                                        {e.brand} - {e.name} ({e.priceType === 'on_request' ? 'Sur devis' : `${e.price} € ${e.priceTax}`})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleAddEditItem(editAddItemSelect)}
                                    style={{ padding: '8px 18px', borderRadius: '980px', backgroundColor: '#1d1d1f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}
                                  >
                                    + Ajouter
                                  </button>
                                </div>

                                {/* Discount / Global Promo */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', maxWidth: '320px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap' }}>Remise / Promo globale (%) :</label>
                                  <input
                                    type="number"
                                    value={editDiscount}
                                    onChange={e => setEditDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                                    style={{ width: '80px', padding: '6px 12px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', textAlign: 'center', fontSize: '13px' }}
                                    min="0"
                                    max="100"
                                  />
                                </div>
                              </div>

                              {/* Calculated Summary */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#6e6e73' }}>
                                  <div>Durée : <strong>{liveDur} jour{liveDur > 1 ? 's' : ''}</strong></div>
                                  <div>Coeff : <strong>x{liveCoeff.toFixed(2)}</strong></div>
                                  <div>Total Estimé HT : <strong style={{ color: '#1d1d1f', fontSize: '15px' }}>{liveHT.toLocaleString('fr-FR')} €</strong></div>
                                  <div>Total TTC : <strong style={{ color: '#86868b' }}>{liveTTC.toLocaleString('fr-FR')} €</strong></div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="submit"
                                    disabled={quotesActionLoading === q.id}
                                    style={{ padding: '10px 20px', borderRadius: '980px', backgroundColor: '#0071e3', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    {quotesActionLoading === q.id ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : 'Enregistrer'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuoteId(null)}
                                    style={{ padding: '10px 20px', borderRadius: '980px', backgroundColor: '#e8e8ed', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div key={q.id} style={{ border: '1px solid rgba(0,0,0,.08)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1d1d1f' }}>Devis #{q.id}</div>
                                <div style={{ fontSize: '13px', color: '#86868b', marginTop: '2px' }}>
                                  Client : <strong>{q.userName}</strong> ({q.userEmail})
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '980px', backgroundColor: '#e8f1fd', color: '#0071e3', textTransform: 'uppercase' }}>
                                En attente d'étude
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', backgroundColor: '#f5f5f7', borderRadius: '12px', padding: '16px', fontSize: '13px' }}>
                              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: 700, color: '#6e6e73' }}>Période de location :</span>
                                <span style={{ color: '#1d1d1f' }}>
                                  du {new Date(q.startDate).toLocaleDateString('fr-FR')} au {new Date(q.endDate).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              {q.notes && (
                                <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ fontWeight: 700, color: '#6e6e73' }}>Notes client :</span>
                                  <span style={{ color: '#1d1d1f', fontStyle: 'italic' }}>"{q.notes}"</span>
                                </div>
                              )}
                            </div>

                            {/* Gear details */}
                            <div style={{ border: '1px solid rgba(0,0,0,.04)', borderRadius: '12px', overflow: 'hidden' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f5f5f7', borderBottom: '1px solid rgba(0,0,0,.06)', fontWeight: 600 }}>
                                    <th style={{ padding: '10px 16px' }}>Matériel</th>
                                    <th style={{ padding: '10px 16px' }}>Quantité</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Tarif Unitaire (HT)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {q.items.map((it: any, index: number) => (
                                    <tr key={index} style={{ borderBottom: index < q.items.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                                      <td style={{ padding: '10px 16px' }}><strong>{it.brand}</strong> - {it.name}</td>
                                      <td style={{ padding: '10px 16px' }}>{it.quantity}</td>
                                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                        {it.priceType === 'on_request' ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} €`}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pricing summary & actions */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: '16px' }}>
                              <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                                <div>
                                  <span style={{ color: '#86868b' }}>Total Estimé HT : </span>
                                  <strong style={{ color: '#1d1d1f', fontSize: '16px' }}>{q.totalHT.toLocaleString('fr-FR')} €</strong>
                                </div>
                                <div>
                                  <span style={{ color: '#86868b' }}>Total TTC : </span>
                                  <strong style={{ color: '#86868b' }}>{q.totalTTC.toLocaleString('fr-FR')} €</strong>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                  onClick={() => handleUpdateQuoteStatus(q.id, 'validated')}
                                  disabled={quotesActionLoading === q.id}
                                  style={{
                                    padding: '10px 20px',
                                    borderRadius: '980px',
                                    backgroundColor: '#1db954',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  {quotesActionLoading === q.id ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : 'Valider'}
                                </button>

                                <button
                                  onClick={() => startEditingQuote(q)}
                                  disabled={quotesActionLoading === q.id}
                                  style={{
                                    padding: '10px 20px',
                                    borderRadius: '980px',
                                    backgroundColor: '#f5f5f7',
                                    color: '#1d1d1f',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  Modifier
                                </button>

                                <button
                                  onClick={() => handleUpdateQuoteStatus(q.id, 'cancelled')}
                                  disabled={quotesActionLoading === q.id}
                                  style={{
                                    padding: '10px 20px',
                                    borderRadius: '980px',
                                    backgroundColor: 'transparent',
                                    color: '#ef4444',
                                    border: '1px solid #ef4444',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  Refuser
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f5f5f7', borderRadius: '16px', color: '#86868b', fontSize: '14px' }}>
                      Aucun devis en attente d'étude pour le moment.
                    </div>
                  )}
                </div>

                {/* HISTORICAL QUOTES SECTION */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,.02)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px' }}>Historique des Devis Traités</h3>
                  
                  {loadingQuotes ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                      <Loader2 style={{ width: '24px', height: '24px', color: '#1d1d1f', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : adminQuotes.filter(q => q.status !== 'pending' && q.status !== 'draft').length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(0,0,0,.06)', backgroundColor: '#f5f5f7', fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            <th style={{ padding: '14px 20px' }}>ID / Client</th>
                            <th style={{ padding: '14px 20px' }}>Période</th>
                            <th style={{ padding: '14px 20px' }}>Articles</th>
                            <th style={{ padding: '14px 20px' }}>Total (HT)</th>
                            <th style={{ padding: '14px 20px' }}>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminQuotes.filter(q => q.status !== 'pending' && q.status !== 'draft').map((q) => (
                            <tr key={q.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                              <td style={{ padding: '16px 20px' }}>
                                <div style={{ fontWeight: 800 }}>{q.id}</div>
                                <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>{q.userName}</div>
                              </td>
                              <td style={{ padding: '16px 20px' }}>
                                <div>Du {new Date(q.startDate).toLocaleDateString('fr-FR')}</div>
                                <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>Au {new Date(q.endDate).toLocaleDateString('fr-FR')}</div>
                              </td>
                              <td style={{ padding: '16px 20px' }}>
                                <div style={{ fontWeight: 600 }}>{q.items.reduce((sum: number, it: any) => sum + it.quantity, 0)} articles</div>
                                <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                                  {q.items.map((it: any) => `${it.name} (x${it.quantity})`).join(', ')}
                                </div>
                              </td>
                              <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                                {q.totalHT.toLocaleString('fr-FR')} €
                              </td>
                              <td style={{ padding: '16px 20px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  padding: '4px 12px',
                                  borderRadius: '980px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: q.status === 'validated' ? '#e2fbe8' : '#fef2f2',
                                  color: q.status === 'validated' ? '#1db954' : '#ef4444'
                                }}>
                                  {q.status === 'validated' ? 'Validé' : 'Annulé'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#86868b' }}>
                      Aucun devis traité archivé.
                    </div>
                  )}
                </div>
              </div>
            )}

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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Spécifications (séparées par une virgule)</label>
                  <input type="text" placeholder="ex: Actif 2 voies, SPL max 142dB, Guide d'onde DOSC" value={specsInput} onChange={e => setSpecsInput(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>URL de l'image (optionnel)</label>
                  <input type="text" placeholder="ex: https://images.unsplash.com/photo-..." value={image} onChange={e => setImage(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} />
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
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Quantité stock *</label>
                      <input type="number" placeholder="4" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                    </div>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Spécifications (séparées par une virgule)</label>
                  <input type="text" placeholder="ex: Actif 2 voies, SPL max 142dB, Guide d'onde DOSC" value={specsInput} onChange={e => setSpecsInput(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>URL de l'image (optionnel)</label>
                  <input type="text" placeholder="ex: https://images.unsplash.com/photo-..." value={image} onChange={e => setImage(e.target.value)} style={{ padding: '12px 18px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} />
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
                      <label style={{ fontSize: '13px', fontWeight: 600 }}>Quantité stock *</label>
                      <input type="number" placeholder="4" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ padding: '10px 16px', borderRadius: '980px', border: '1px solid rgba(0,0,0,.12)', outline: 'none', fontSize: '14px' }} required />
                    </div>
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

      </div>

      <Footer />
    </div>
  );
}
