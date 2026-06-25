// src/pages/Inventory.jsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal';
import Header from '../components/Header';
import Table from '../components/Table/Table';
import TableActions from '../components/ActionButton/TableActions';

const StoreInventory = () => {
  // State for UI
  const { storeId } = useParams();
  console.log('storeId from useParams:', storeId);
  const [activeTab, setActiveTab] = useState('books');
  const [showModal, setShowModal] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [newBookId, setNewBookId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Set active tab based on view query param
  const view = 'books';
  useEffect(() => {
    if (view === 'authors' || view === 'books') {
      setActiveTab(view);
    }
  }, [view]);

  // fetch inventory data
  useEffect(() => 
  {
    fetch('/data/inventory.json')
      .then((response) => response.json())
      .then((data) => 
      {
        console.log('storeId:', storeId);
        //console.log('Fetched inventory:', data);
        const list = Array.isArray(data) ? data : [data];
        setInventory(list.filter((entry) => String(entry.store_id) === String(storeId)));
      })
      .catch((error) => console.error('Error fetching inventory:', error));
  }, [storeId]);

  // fetch books data
  useEffect(() => 
  {
    fetch('/data/books.json')
      .then((response) => response.json())
      .then((data) => 
      {
        //console.log('Fetched books:', data);
        setBooks(Array.isArray(data) ? data : [data]);
      })
      .catch((err) => console.error('Error fetching books:', err));
  }, []);

  // fetch authors data
  useEffect(() => 
  {
    fetch('/data/authors.json')
      .then((response) => response.json())
      .then((data) => 
      {
        //console.log('Fetched authors:', data);
        setAuthors(Array.isArray(data) ? data : [data]);
      })
      .catch((err) => console.error('Error fetching authors:', err));
  }, []);

  useEffect(() => 
  {
    const search = searchParams.get('search') || '';
    setSearchTerm(search);
  }, [searchParams]);

  const enrichedInventory = useMemo(() => 
  {
    return inventory.map((entry) => 
    {
      const book = books.find((b) => b.id === entry.book_id);
      const author = authors.find((a) => a.id === book?.author_id);
      return {
        ...entry,
        name: book?.name ?? '—',
        pages: book?.page_count ?? '—',
        author: author ? `${author.first_name} ${author.last_name}` : '—',
      };
    });
  }, [inventory, books, authors]);

  const filteredInventory = useMemo(() => 
  {
    if (!searchTerm.trim()) 
      return enrichedInventory;
    const lower = searchTerm.toLowerCase();
    return enrichedInventory.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(lower)));
  }, [enrichedInventory, searchTerm]);

  // Modal controls
  const openModal = () => setShowModal(true);
  const closeModal = () => 
  {
    setShowModal(false);
    setNewBookId('');
    setNewPrice('');
  };

  const handleEdit = (book) => 
  {
    setEditingRowId(book.id);
    setEditPrice(String(book.price));
  };

  const handleSave = (id) => 
  {
    const parsed = parseFloat(editPrice);
    if (isNaN(parsed) || parsed < 0) 
    { 
      alert('Please enter a valid price.'); 
      return; 
    }
    setInventory((prev) => prev.map((b) => (b.id === id ? { ...b, price: parsed } : b)));
    setEditingRowId(null);
    setEditPrice('');
  };

  const handleCancel = () => 
  {
     setEditingRowId(null); 
     setEditPrice(''); 
  };

  const handleDelete = (id, name) => 
  {
    if (window.confirm(`Remove "${name}" from this store's inventory?`)) 
    {
      setInventory((prev) => prev.filter((b) => b.id !== id));
      if (editingRowId === id) 
        handleCancel();
    }
  };

  const handleAddBook = () => 
  {
    if (!newBookId) 
    { 
      alert('Please select a book.'); 
      return; 
    }
    const parsed = parseFloat(newPrice);
    if (isNaN(parsed) || parsed < 0) 
    { 
      alert('Please enter a valid price.'); 
      return; 
    }
    const newId = inventory.length > 0 ? Math.max(...inventory.map((e) => e.id)) + 1 : 1;
    setInventory((prev) => [
      ...prev,
      { id: newId, book_id: Number(newBookId), store_id: Number(storeId), price: parsed }
    ]);
    closeModal();
  };

  const columns = useMemo(
    () => [
      { header: 'Book Id', accessorKey: 'book_id' },
      { header: 'Name', accessorKey: 'name' },
      { header: 'Pages', accessorKey: 'pages' },
      { header: 'Author', accessorKey: 'author' },
      {
        header: 'Price',
        accessorKey: 'price',
        cell: ({ row }) =>
          editingRowId === row.original.id ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  
                    handleSave(row.original.id);
                if (e.key === 'Escape') 
                    handleCancel();
              }}
              className="border border-gray-300 rounded p-1 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            `$${Number(row.original.price).toFixed(2)}`
          ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => (
          <TableActions
            row={row}
            onEdit={
              editingRowId === row.original.id
                ? handleCancel
                : () => handleEdit(row.original)
            }
            onDelete={() => handleDelete(row.original.id, row.original.name)}
          />
        ),
      },
    ],
    [editingRowId, editPrice]
  );

  return (
    <div className="py-6">
      <div className="flex mb-4 w-full justify-center items-center">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 border-b-2 py-2 ${activeTab === 'books' ? 'border-b-main' : 'border-b-transparent'}`}
        >
          Books
        </button>
        <button
          onClick={() => setActiveTab('authors')}
          className={`px-4 border-b-2 py-2 ${activeTab === 'authors' ? 'border-b-main' : 'border-b-transparent'}`}
        >
          Authors
        </button>
      </div>

      <Header addNew={openModal} title={`Store Inventory`} buttonTitle="Add to inventory" />

      {activeTab === 'books' ? (
          inventory.length > 0 ? (<Table data={filteredInventory} columns={columns} />) : (<p className="text-gray-600">No books found in this store.</p>)
      ) : (
          <p className="text-gray-600">No authors with books in this store.</p>
      )}

      <Modal
          title="Add Book to Store"
          save={handleAddBook}
          cancel={closeModal}
          show={showModal}
          setShow={setShowModal}
        >
          <div className="flex flex-col gap-4 w-full">
            <div>
              <label htmlFor="book_select" className="block text-gray-700 font-medium mb-1">
                Select Book
              </label>
              <select
                id="book_select"
                value={newBookId}
                onChange={(e) => setNewBookId(e.target.value)}
                className="border border-gray-300 rounded p-2 w-full"
              >
                <option value="" disabled>— choose a book —</option>
                {books
                  .filter((b) => !inventory.some((e) => e.book_id === b.id))
                  .map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))
                }
              </select>
            </div>

            <div>
              <label htmlFor="price" className="block text-gray-700 font-medium mb-1">
                Price
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="border border-gray-300 rounded p-2 w-full"
                placeholder="Enter Price (e.g., 29.99)"
              />
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default StoreInventory;