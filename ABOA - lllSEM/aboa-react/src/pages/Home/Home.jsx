import Header from "../../components/Header.jsx";
import styles from "./Home.module.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config/api.js";

const USER_LOCATION_KEY = "aboa:userLocation";
const USER_LOCATION_UPDATED_EVENT = "aboa:userLocationUpdated";
const RAIOS_DISPONIVEIS = [5, 10, 15, 20];

const userIcon = L.divIcon({
  className: styles.userMapPin,
  html: "<span></span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const restaurantIcon = L.divIcon({
  className: styles.restaurantMapPin,
  html: "<span></span>",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function lerLocalizacaoSalva() {
  const salvo = sessionStorage.getItem(USER_LOCATION_KEY);
  if (!salvo) return null;

  try {
    const dados = JSON.parse(salvo);
    const lat = Number(dados.lat);
    const lng = Number(dados.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    return null;
  }
}

function getCoordenadasRestaurante(restaurante) {
  const coords = restaurante?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

function formatarDistancia(distanciaKm) {
  if (typeof distanciaKm !== "number") return null;

  return `${distanciaKm.toLocaleString("pt-BR", {
    maximumFractionDigits: 1
  })} km`;
}

async function obterLocalizacaoAtual() {
  const localizacaoSalva = lerLocalizacaoSalva();
  if (localizacaoSalva) return localizacaoSalva;

  if (!navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const localizacao = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };

        sessionStorage.setItem(
          USER_LOCATION_KEY,
          JSON.stringify({
            ...localizacao,
            accuracy: pos.coords.accuracy,
            updatedAt: Date.now()
          })
        );

        window.dispatchEvent(new Event(USER_LOCATION_UPDATED_EVENT));
        resolve(localizacao);
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000
      }
    );
  });
}

export default function Home() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [modalRaioAberto, setModalRaioAberto] = useState(false);
  const [raioSelecionado, setRaioSelecionado] = useState(10);
  const [localizacaoMapa, setLocalizacaoMapa] = useState(null);
  const [restaurantesRaio, setRestaurantesRaio] = useState([]);
  const [mensagemRaio, setMensagemRaio] = useState("");
  const [carregandoRaio, setCarregandoRaio] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const localizacaoSalva = sessionStorage.getItem(USER_LOCATION_KEY);

    if (!token || localizacaoSalva || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sessionStorage.setItem(
          USER_LOCATION_KEY,
          JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            updatedAt: Date.now()
          })
        );
        window.dispatchEvent(new Event(USER_LOCATION_UPDATED_EVENT));
      },
      (err) => {
        sessionStorage.setItem(
          USER_LOCATION_KEY,
          JSON.stringify({
            error: err.code,
            updatedAt: Date.now()
          })
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000
      }
    );
  }, []);

  function enviarBusca() {
    if (!busca.trim()) return;
    navigate(`/recomenda?q=${encodeURIComponent(busca)}`);
  }

  async function buscarPorRaio(raioKm = raioSelecionado) {
    const localizacao = await obterLocalizacaoAtual();

    if (!localizacao) {
      setLocalizacaoMapa(null);
      setRestaurantesRaio([]);
      setMensagemRaio("Permita o acesso à localização para buscar lugares próximos.");
      return;
    }

    setLocalizacaoMapa(localizacao);
    setMensagemRaio("");
    setCarregandoRaio(true);

    try {
      const resp = await fetch(
        `${API_URL}/api/estabelecimentos?lat=${localizacao.lat}&lng=${localizacao.lng}&raioKm=${raioKm}`
      );
      const data = await resp.json();

      if (!resp.ok) {
        setMensagemRaio("Não foi possível buscar estabelecimentos agora.");
        setRestaurantesRaio([]);
        return;
      }

      setRestaurantesRaio(data);

      const restaurantesComCoordenadas = data.filter(getCoordenadasRestaurante);

      if (data.length === 0) {
        setMensagemRaio("Nenhum restaurante encontrado nesse raio.");
      } else if (restaurantesComCoordenadas.length === 0) {
        setMensagemRaio("Encontramos restaurantes, mas eles ainda não têm localização registrada.");
      }
    } catch (err) {
      setMensagemRaio("Erro de conexão com o servidor.");
      setRestaurantesRaio([]);
    } finally {
      setCarregandoRaio(false);
    }
  }

  function abrirBuscaPorRaio() {
    setModalRaioAberto(true);
    buscarPorRaio(raioSelecionado);
  }

  function selecionarRaio(raioKm) {
    const raioLimitado = Math.min(raioKm, 20);
    setRaioSelecionado(raioLimitado);
    buscarPorRaio(raioLimitado);
  }

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.hero}>

        {/* Lado esquerdo */}
        <img
          src="/imgs/Group 5 - Copia - Copia.png"
          className={`${styles.sideDecor} ${styles.leftImage}`}
          alt="Decoração esquerda"
        />

        {/* Centro */}
        <div className={styles.centerContent}>
          <h1 className={styles.title}>Qual vai ser a boa de hoje?</h1>

          <p className={styles.subtitle}>
            Descubra lugares incríveis, do jeito que você gosta.
          </p>

          <div className={styles.searchWrapper}>
            <span className={styles.pin}>📍</span>

            <input
              type="text"
              placeholder="Onde você quer ir?"
              className={styles.searchInput}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarBusca()}
            />

            <button className={styles.searchButton} onClick={enviarBusca}>
              Buscar
            </button>
          </div>

          <button className={styles.radiusButton} onClick={abrirBuscaPorRaio}>
            Buscar por raio
          </button>

          <div className={styles.tags}>
            <span onClick={() => navigate("/recomenda?q=hamburgueria")}>🍔 Burgers</span>
            <span onClick={() => navigate("/recomenda?q=pizza")}>🍕 Pizza</span>
            <span onClick={() => navigate("/recomenda?q=bar")}>🍹 Bar</span>
            <span onClick={() => navigate("/recomenda?q=doce")}>🍬 Doces</span>
            <span onClick={() => navigate("/recomenda?q=japonesa")}>🍣 Japonesa</span>
          </div>
        </div>

        {/* Lado direito */}
        <img
          src="/imgs/Group 5 - Copia.png"
          className={`${styles.sideDecor} ${styles.rightImage}`}
          alt="Decoração direita"
        />
      </div>

      <footer className={styles.footer}>
        <div>© 2025 ABOA — Todos os direitos reservados</div>

        <div className={styles.footerIcons}>
          <img src="/imgs/icons8-instagram-50.png" />
          <img src="/imgs/icons8-x-50.png" />
        </div>
      </footer>

      {modalRaioAberto && (
        <div className={styles.radiusOverlay}>
          <div className={styles.radiusModal}>
            <div className={styles.radiusHeader}>
              <h2>Buscar por raio</h2>
              <button
                className={styles.closeRadiusModal}
                onClick={() => setModalRaioAberto(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.radiusOptions}>
              {RAIOS_DISPONIVEIS.map((raio) => (
                <button
                  key={raio}
                  className={raioSelecionado === raio ? styles.radiusActive : ""}
                  onClick={() => selecionarRaio(raio)}
                >
                  {raio} km
                </button>
              ))}
            </div>

            {mensagemRaio && (
              <p className={styles.radiusMessage}>{mensagemRaio}</p>
            )}

            <div className={styles.mapBox}>
              {localizacaoMapa ? (
                <MapContainer
                  center={[localizacaoMapa.lat, localizacaoMapa.lng]}
                  zoom={13}
                  className={styles.map}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Marker
                    position={[localizacaoMapa.lat, localizacaoMapa.lng]}
                    icon={userIcon}
                  >
                    <Popup>Você está aqui</Popup>
                  </Marker>

                  {restaurantesRaio.map((restaurante) => {
                    const coords = getCoordenadasRestaurante(restaurante);
                    if (!coords) return null;

                    return (
                      <Marker
                        key={restaurante._id}
                        position={[coords.lat, coords.lng]}
                        icon={restaurantIcon}
                      >
                        <Popup>
                          <div className={styles.popupContent}>
                            <strong>{restaurante.nome}</strong>
                            {formatarDistancia(restaurante.distanciaKm) && (
                              <span>
                                {formatarDistancia(restaurante.distanciaKm)} de você
                              </span>
                            )}
                            <button
                              onClick={() =>
                                navigate("/cardapio", {
                                  state: { restaurante }
                                })
                              }
                            >
                              Ver estabelecimento
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className={styles.mapPlaceholder}>
                  Permita a localização para visualizar o mapa.
                </div>
              )}
            </div>

            {carregandoRaio && (
              <p className={styles.radiusMessage}>Buscando restaurantes...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
