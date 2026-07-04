'use client';

interface NumeroSelectorProps {
  cantidad: number;
  onChange: (cantidad: number) => void;
  max?: number;
}

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export default function NumeroSelector({ cantidad, onChange, max = 999 }: NumeroSelectorProps) {
  const agregarDigito = (digito: number) => {
    const nuevaCantidad = parseInt(cantidad.toString() + digito.toString());
    if (nuevaCantidad <= max) {
      onChange(nuevaCantidad);
    }
  };

  const borrar = () => {
    const str = cantidad.toString();
    if (str.length > 1) {
      onChange(parseInt(str.slice(0, -1)));
    } else {
      onChange(0);
    }
  };

  return (
    <div className="bg-white rounded-xl p-2 shadow-xl">
      {/* Display */}
      <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-2 mb-2 border border-blue-300">
        <p className="text-xs text-gray-700 text-center">Cantidad:</p>
        <p className="text-2xl font-bold text-center text-blue-600">{cantidad}</p>
      </div>

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-1 mb-1">
        {NUMEROS.slice(0, 9).map((num) => (
          <button
            key={num}
            onClick={() => agregarDigito(num)}
            className="aspect-square bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 border border-blue-600 flex items-center justify-center overflow-hidden"
          >
            <img 
              src={`/numeros/${num}.png`}
              alt={num.toString()}
              className="w-full h-full object-contain p-0.5"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold">${num}</span>`;
              }}
            />
          </button>
        ))}
      </div>

      {/* Fila inferior: Borrar, 0, Limpiar */}
      <div className="grid grid-cols-3 gap-1">
        <button
          onClick={borrar}
          className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-2 rounded-lg text-lg font-bold shadow-md active:scale-95 transition-all"
        >
          ⌫
        </button>
        <button
          onClick={() => agregarDigito(0)}
          className="aspect-square bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 border border-blue-600 flex items-center justify-center overflow-hidden"
        >
          <img 
            src="/numeros/0.png"
            alt="0"
            className="w-full h-full object-contain p-0.5"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl font-bold">0</span>';
            }}
          />
        </button>
        <button
          onClick={() => onChange(0)}
          className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-all"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
