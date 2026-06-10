import React, { useState, useEffect } from "react";
import styles from "./minhaconta.module.css";
import Header from "../../components/Header.jsx";
import EditarPerfilModal from "./EditarPerfilModal.jsx";
import EditarItemModal from "./EditarItemModal.jsx";
import { API_URL } from "../../config/api.js";

export default function MinhaContaRest() {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  const emptyItem = {
    _id: null,
    nome: "",
    descricao: "",
    preco: "",
    foto: null,
    tipo: "principal",

    disponivel: true,
    emPromocao: false,
    precoPromocional: "",
    textoPromocao: "",
  };

  const [menuItems, setMenuItems] = useState([]);
  const [modalItemAberto, setModalItemAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [formItem, setFormItem] = useState(emptyItem);

  // =====================================================
  // FUNÇÃO GLOBAL PARA CARREGAR ITENS (evita duplicação)
  // =====================================================
  async function carregarItens() {
    const token = localStorage.getItem("token");

    const resp = await fetch(`${API_URL}/api/cardapio/meus`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const itens = await resp.json();

    const itensNormalizados = itens.map((item) => ({
      ...item,
      disponivel: item.disponivel === true || item.disponivel === "true",
      emPromocao: item.emPromocao === true || item.emPromocao === "true",
    }));

    setMenuItems(itensNormalizados);
  }

  // =====================================================
  // BUSCAR PERFIL + ITENS
  // =====================================================
  useEffect(() => {
    async function carregarPerfil() {
      try {
        const token = localStorage.getItem("token");

        const resp = await fetch(
          `${API_URL}/api/estabelecimentos/meu`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!resp.ok) {
          setLoading(false);
          return;
        }

        const dados = await resp.json();

        setPerfil({
          foto: dados.fotoUrl ? `${API_URL}${dados.fotoUrl}` : null,
          nome: dados.nome,
          endereco: dados.endereco,
          telefone: dados.telefone,
          descricao: dados.descricao,
          categoria: dados.categoria || "",
          tags: Array.isArray(dados.tags) ? dados.tags : [],
        });

        await carregarItens();
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }

    carregarPerfil();
  }, []);

  // =====================================================
  // CARDÁPIO – FUNÇÕES
  // =====================================================
  function abrirNovoItem() {
    setEditando(false);
    setFormItem({ ...emptyItem });
    setModalItemAberto(true);
  }

  function editarItem(item) {
    setEditando(true);
    setFormItem(item);
    setModalItemAberto(true);
  }

  async function salvarItem() {
    const token = localStorage.getItem("token");

    if (!formItem.nome || !formItem.preco) {
      alert("Preencha nome e preço.");
      return;
    }

    const formData = new FormData();
    formData.append("nome", formItem.nome);
    formData.append("descricao", formItem.descricao || "");
    formData.append("preco", formItem.preco);

    formData.append("disponivel", formItem.disponivel);
    formData.append("emPromocao", formItem.emPromocao);
    formData.append("precoPromocional", formItem.precoPromocional || "");
    formData.append("textoPromocao", formItem.textoPromocao || "");
    formData.append("tipo", formItem.tipo);

    if (formItem.foto instanceof File) {
      formData.append("foto", formItem.foto);
    }

    let resposta;

    if (editando) {
      resposta = await fetch(
        `${API_URL}/api/cardapio/${formItem._id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
    } else {
      resposta = await fetch(`${API_URL}/api/cardapio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      alert("Erro ao salvar item.");
      return;
    }

    // =========================================
    // ATUALIZAR IMEDIATAMENTE (SEM REFRESH)
    // =========================================
    await carregarItens();

    setModalItemAberto(false);
    setFormItem({ ...emptyItem });
  }

  async function removerItem(id) {
    const token = localStorage.getItem("token");

    const ok = confirm("Deseja remover este item?");
    if (!ok) return;

    await fetch(`${API_URL}/api/cardapio/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    await carregarItens();
  }

  // =====================================================
  // JSX
  // =====================================================
  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <Header />
        <p style={{ marginTop: "40px", textAlign: "center" }}>Carregando...</p>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className={styles.pageWrapper}>
        <Header />
        <p style={{ marginTop: "40px", textAlign: "center" }}>
          Nenhum estabelecimento encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.background}></div>
      <Header />

      <div className={styles.container}>
        <h1>Minha Conta</h1>

        {/* PERFIL */}
        <div className={styles.perfilRow}>
          <div className={styles.fotoWrapper}>
            {perfil.foto ? (
              <img src={perfil.foto} alt="foto" className={styles.fotoPerfil} />
            ) : (
              <div className={styles.fotoVazia}>Sem foto</div>
            )}
          </div>

          <div className={styles.infos}>
            <h2 className={styles.nome}>{perfil.nome}</h2>

            <p>
              <b>Endereço:</b> {perfil.endereco}
            </p>

            <p>
              <b>Telefone:</b> {perfil.telefone}
            </p>

            <p className={styles.descricao}>{perfil.descricao}</p>

            <div className={styles.categoriaBox}>
              <strong>Categoria:</strong>
              <span className={styles.categoriaTag}>
                {perfil.categoria || "Não informada"}
              </span>
            </div>

            <div className={styles.tagsBox}>
              <strong>Tags:</strong>

              <div className={styles.tagsList}>
                {perfil.tags.length > 0 ? (
                  perfil.tags.map((t, i) => (
                    <span key={i} className={styles.tagChip}>
                      {t}
                    </span>
                  ))
                ) : (
                  <span className={styles.semTags}>
                    Nenhuma tag cadastrada
                  </span>
                )}
              </div>
            </div>

            <button
              className={styles.editarPerfilBtn}
              onClick={() => setModalPerfilAberto(true)}
            >
              Editar Perfil
            </button>
          </div>
        </div>

        <hr className={styles.divider} />

        {/* CARDÁPIO */}
        <div className={styles.cardapioHeader}>
          <h2>Cardápio</h2>
          <button className={styles.addItemBtn} onClick={abrirNovoItem}>
            + Adicionar Item
          </button>
        </div>

        <div className={styles.menuList}>
          {menuItems.length === 0 ? (
            <p className={styles.placeholder}>Nenhum item cadastrado ainda.</p>
          ) : (
            menuItems.map((item) => (
              <div className={styles.menuItem} key={item._id}>
                <div className={styles.itemLeft}>
                  {item.fotoUrl ? (
                    <img
                      src={`${API_URL}${item.fotoUrl}`}
                      className={styles.itemFoto}
                    />
                  ) : (
                    <div className={styles.itemFotoVazia}>Sem foto</div>
                  )}
                </div>

                <div className={styles.itemInfo}>
                  <h3>{item.nome}</h3>
                  <p>{item.descricao}</p>

                  {item.disponivel ? (
                    <span className={styles.available}>Disponível</span>
                  ) : (
                    <span className={styles.notAvailable}>Indisponível</span>
                  )}

                  {item.emPromocao && (
                    <div className={styles.promoTag}>
                      Promoção: R$ {item.precoPromocional}
                      {item.textoPromocao ? ` — ${item.textoPromocao}` : ""}
                    </div>
                  )}

                  <span className={styles.price}>R$ {item.preco}</span>
                </div>

                <div className={styles.itemActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => editarItem(item)}
                  >
                    Editar
                  </button>

                  <button
                    className={styles.removeBtn}
                    onClick={() => removerItem(item._id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalPerfilAberto && (
        <EditarPerfilModal
          perfil={perfil}
          setPerfil={setPerfil}
          fechar={() => setModalPerfilAberto(false)}
        />
      )}

      {modalItemAberto && (
        <EditarItemModal
          formItem={formItem}
          setFormItem={setFormItem}
          salvarItem={salvarItem}
          fechar={() => setModalItemAberto(false)}
          editando={editando}
        />
      )}
    </div>
  );
}
