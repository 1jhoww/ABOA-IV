import React, { useState } from "react";
import styles from "./cadastroestabelecimento.module.css";
import Header from "../../components/Header.jsx";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config/api.js";

export default function CadastroEstabelecimento() {
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  function handleFileSelect(f) {
    if (!f) return;

    if (f.type !== "image/jpeg") {
      alert("Envie apenas imagem JPG.");
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);

    const f = e.dataTransfer.files[0];
    handleFileSelect(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      alert("Envie uma foto JPG do estabelecimento.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Você precisa fazer login para cadastrar um estabelecimento.");
      return;
    }

    const form = e.target;
    const data = new FormData();

    // CAMPOS NORMAIS
    data.append("nome", form.nome.value);
    data.append("endereco", form.endereco.value);
    data.append("telefone", form.telefone.value);
    data.append("descricao", form.descricao.value);
    data.append("foto", file);

    // CATEGORIA (obrigatória)
    data.append("categoria", form.categoria.value);

    // TAGS (opcional)
    const tags = form.tags.value
      ? form.tags.value.split(",").map((t) => t.trim())
      : [];
    data.append("tags", JSON.stringify(tags));

    try {
      const resp = await fetch(`${API_URL}/api/estabelecimentos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      const json = await resp.json();

      if (resp.ok) {
        // ATUALIZA O USUÁRIO AUTOMATICAMENTE
        if (json.usuario) {
          localStorage.setItem("usuario", JSON.stringify(json.usuario));
        }

        alert("Estabelecimento cadastrado com sucesso!");

        // limpa o form
        form.reset();
        setPreview(null);
        setFile(null);

        // redireciona automaticamente para Minha Conta Restaurante
        navigate("/minha-conta-rest");
      }
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.background}></div>

      <Header />

      <div className={styles.container}>
        <h1>Cadastro de Estabelecimento</h1>

        <p className={styles.subtitle}>
          Envie uma foto do <b>espaço do estabelecimento</b> (somente JPG).
          Não envie fotos de pessoas.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* FOTO */}
          <div
            className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {!preview ? (
              <>
                <p>Arraste a foto do espaço aqui</p>
                <span>Clique para enviar (JPG)</span>
                <input
                  type="file"
                  accept="image/jpeg"
                  className={styles.fileInput}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
              </>
            ) : (
              <img src={preview} alt="Preview" className={styles.previewImage} />
            )}
          </div>

          {/* NOME */}
          <div className={styles.formGroup}>
            <label>Nome do estabelecimento</label>
            <input
              name="nome"
              type="text"
              placeholder="Ex: Hamburgueria Sunset"
              required
            />
          </div>

          {/* ENDEREÇO */}
          <div className={styles.formGroup}>
            <label>Endereço</label>
            <input
              name="endereco"
              type="text"
              placeholder="Rua, número, bairro..."
              required
            />
          </div>

          {/* TELEFONE */}
          <div className={styles.formGroup}>
            <label>Telefone</label>
            <input name="telefone" type="text" placeholder="(11) 99999-9999" />
          </div>

          {/* DESCRIÇÃO */}
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea
              name="descricao"
              placeholder="Conte um pouco sobre o local..."
            />
          </div>

          {/* CATEGORIA — AGORA GARANTIDO QUE ESTÁ DENTRO DO FORM */}
          <div className={styles.formGroup}>
            <label>Categoria *</label>
            <select name="categoria" required className={styles.input}>
              <option value="">Selecione a categoria</option>
              <option value="hamburgueria">Hamburgueria</option>
              <option value="japonesa">Japonesa</option>
              <option value="pizzaria">Pizzaria</option>
              <option value="bar">Bar</option>
              <option value="lanches">Lanches</option>
              <option value="brasileira">Brasileira</option>
              <option value="doces">Doces</option>
              <option value="açai">Açaí</option>
              <option value="churrasco">Churrasco</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          {/* TAGS */}
          <div className={styles.formGroup}>
            <label>Tags (opcional)</label>
            <input
              name="tags"
              type="text"
              placeholder="hambúrguer, artesanal, cheddar..."
              className={styles.input}
            />
          </div>

          <button className={styles.registerBtn}>Cadastrar</button>
        </form>

      </div>
    </div>
  );
}
