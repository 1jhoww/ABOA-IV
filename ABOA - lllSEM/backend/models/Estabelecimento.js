import mongoose from "mongoose";

const EstabelecimentoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  endereco: { type: String, required: true },
  telefone: String,
  descricao: String,
  fotoUrl: String,
  location: {
    type: {
      type: String,
      enum: ["Point"]
    },
    coordinates: {
      type: [Number]
    }
  },

  // CATEGORIA (obrigatória)
  categoria: {
    type: String,
    required: true,
    enum: [
      "hamburgueria",
      "japonesa",
      "pizzaria",
      "bar",
      "lanches",
      "brasileira",
      "doces",
      "açai",
      "churrasco",
      "outros"
    ]
  },

  // TAGS (opcional)
  tags: {
    type: [String],
    default: []
  },

  // DONO
  donoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true
  }
});

EstabelecimentoSchema.index({ location: "2dsphere" });

export default mongoose.model("Estabelecimento", EstabelecimentoSchema);
