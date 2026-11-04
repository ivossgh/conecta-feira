import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import imageCompression from 'browser-image-compression';

interface ProductFormProps {
  productToEdit?: any;       // O produto que será editado (opcional)
  onSuccess: () => void;     // Função para avisar que terminou
  onCancel: () => void;      // Função para cancelar a edição
}

export default function ProductForm({ productToEdit, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Verduras');
  const [unit, setUnit] = useState('kg');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categories = ["Verduras", "Frutas", "Raízes", "Doces/Caseiros", "Artesanato", "Outros"];
  const units = ["kg", "un", "maço", "bandeja", "litro", "pote"];

  // EFEITO MÁGICO: Quando o produto para editar muda, preenche o formulário
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPrice(productToEdit.price.toString());
      setCategory(productToEdit.category || 'Verduras');
      setUnit(productToEdit.unit || 'kg');
    } else {
      clearForm();
    }
  }, [productToEdit]);

  const clearForm = () => {
    setName('');
    setPrice('');
    setCategory('Verduras');
    setUnit('kg');
    setImageFile(null);
  };

  const handleImageChange = async (event: any) => {
    const file = event.target.files[0];
    if (file) setImageFile(file);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    
    // Validação básica
    if (!name || !price) {
      alert("Preencha nome e preço!");
      return;
    }
    // Se for NOVO produto, a foto é obrigatória. Se for EDIÇÃO, é opcional (mantém a antiga).
    if (!productToEdit && !imageFile) {
      alert("Escolha uma foto para o produto novo!");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado!");

      let finalImageUrl = productToEdit?.image_url;

      // 1. Se o usuário escolheu uma NOVA foto, faz upload
      if (imageFile) {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(imageFile, options);
        
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('produtos')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrl;
      }

      const productData = {
        name,
        price: parseFloat(price.replace(',', '.')),
        category,
        unit,
        image_url: finalImageUrl,
        owner_id: user.id,
        available: true
      };

      if (productToEdit) {
        // --- MODO ATUALIZAR (UPDATE) ---
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productToEdit.id);
        
        if (error) throw error;
        alert("Produto atualizado!");

      } else {
        // --- MODO CRIAR (INSERT) ---
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        alert("Produto cadastrado!");
      }

      clearForm();
      onSuccess(); // Avisa o Painel para recarregar a lista

    } catch (error: any) {
      console.error(error);
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: productToEdit ? '2px solid #007bff' : '1px solid #ddd', borderRadius: '8px', marginTop: '20px', backgroundColor: productToEdit ? '#f0f8ff' : 'white' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{productToEdit ? '✏️ Editando Produto' : '🍎 Novo Produto'}</h3>
        {productToEdit && (
          <button onClick={onCancel} style={{ padding: '5px 10px', cursor: 'pointer', border: '1px solid #ccc', background: '#fff', borderRadius: '4px' }}>Cancelar Edição</button>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label>Nome:</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Tomate" style={{ padding: '8px' }} />

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label>Preço (R$):</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: '80px' }}>
            <label>Unid:</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%', padding: '9px', backgroundColor: 'white' }}>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <label>Categoria:</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '9px', backgroundColor: 'white' }}>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <label>Foto {productToEdit && '(Só envie se quiser trocar)'}:</label>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        
        <button type="submit" disabled={loading} style={{ marginTop: '10px', padding: '10px', backgroundColor: productToEdit ? '#007bff' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'Salvando...' : (productToEdit ? 'Atualizar Produto' : 'Cadastrar Produto')}
        </button>
      </form>
    </div>
  );
}