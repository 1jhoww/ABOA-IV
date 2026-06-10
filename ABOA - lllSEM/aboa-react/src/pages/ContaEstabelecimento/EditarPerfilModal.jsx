import React, { useState } from "react";
import styles from "./editarperfil.module.css";
import { API_URL } from "../../config/api.js";

export default function EditarPerfilModal({ perfil, setPerfil, fechar }) {
  const [local, setLocal] = useState({
    ...perfil,
    categoria: perfil.categoria || "",
    tags: perfil.tags || []
  });

  const [preview, setPreview] = useState(perfil.foto);
  const [novaFoto, setNovaFoto] = useState(null);
  const [tagInput, setTagInput] = useState(local.tags.join(", "));

  function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Envie apenas imagens.");
      return;
    }

    setNovaFoto(file);

    const url = URL.createObjectURL(file);
    setPreview(url);

    setLocal((prev) => ({
      ...prev,
      foto: url
    }));
  }

  async function salvar() {
    const token = localStorage.getItem("token");

    // 1️⃣ Atualizar FOTO (se selecionou nova)
    if (novaFoto) {
      const data = new FormData();
      data.append("foto", novaFoto);

      const resp = await fetch(
        `${API_URL}/api/estabelecimentos/foto`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: data
        }
      );

      const json = await resp.json();

      if (resp.ok) {
        setLocal((prev) => ({
          ...prev,
          foto: `${API_URL}${json.fotoUrl}`
        }));
      }
    }

    // 2️⃣ Atualizar CAMPOS de texto + categoria + tags
    const resp2 = await fetch(
      `${API_URL}/api/estabelecimentos/meu`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: local.nome,
          endereco: local.endereco,
          telefone: local.telefone,
          descricao: local.descricao,
          categoria: local.categoria,
          tags: local.tags
        })
      }
    );

    const json2 = await resp2.json();

    if (resp2.ok) {
      setPerfil({
        foto: `${API_URL}${json2.fotoUrl}`,
        nome: json2.nome,
        endereco: json2.endereco,
        telefone: json2.telefone,
        descricao: json2.descricao,
        categoria: json2.categoria,
        tags: json2.tags
      });
    }

    fechar();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Editar Perfil</h2>

        {/* FOTO */}
        <div className={styles.fotoArea}>
          {!preview ? (
            <>
              <div className={styles.semFoto}>Sem foto</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </>
          ) : (
            <>
              <img src={preview} className={styles.previewImg} alt="Preview" />

              <button
                className={styles.removeImg}
                onClick={() => {
                  setPreview(null);
                  setLocal((prev) => ({ ...prev, foto: null }));
                  setNovaFoto("REMOVER");
                }}
              >
                Remover foto
              </button>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </>
          )}
        </div>

        {/* NOME */}
        <label>Nome</label>
        <input
          type="text"
          value={local.nome}
          onChange={(e) =>
            setLocal({
              ...local,
              nome: e.target.value
            })
          }
        />

        {/* ENDEREÇO */}
        <label>Endereço</label>
        <input
          type="text"
          value={local.endereco}
          onChange={(e) =>
            setLocal({
              ...local,
              endereco: e.target.value
            })
          }
        />

        {/* TELEFONE */}
        <label>Telefone</label>
        <input
          type="text"
          value={local.telefone}
          onChange={(e) =>
            setLocal({
              ...local,
              telefone: e.target.value
            })
          }
        />

        {/* DESCRIÇÃO */}
        <label>Descrição</label>
        <textarea
          value={local.descricao}
          onChange={(e) =>
            setLocal({
              ...local,
              descricao: e.target.value
            })
          }
        />

        {/* CATEGORIA */}
        <label>Categoria</label>
        <select
          value={local.categoria}
          onChange={(e) =>
            setLocal({
              ...local,
              categoria: e.target.value
            })
          }
          className={styles.input}
        >
          <option value="">Selecione...</option>
          <option value="hamburgueria">Hamburgueria</option>
          <option value="japonesa">Japonesa</option>
          <option value="pizzaria">Pizzaria</option>
          <option value="bar">Bar</option>
          <option value="lanches">Lanches</option>
          <option value="brasileira">Brasileira</option>
          <option value="acai">Açaí</option>
          <option value="doces">Doces</option>
          <option value="outros">Outros</option>
        </select>

        {/* TAGS */}
        <label>Tags (separadas por vírgula)</label>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => {
            const valor = e.target.value;
            setTagInput(valor); // <<< permite digitar vírgula normalmente

            setLocal({
              ...local,
              tags: valor
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t !== "")
            });
          }}
        />



        {/* BOTÕES */}
        <div className={styles.actions}>
          <button className={styles.cancelar} onClick={fechar}>
            Cancelar
          </button>

          <button className={styles.salvar} onClick={salvar}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
