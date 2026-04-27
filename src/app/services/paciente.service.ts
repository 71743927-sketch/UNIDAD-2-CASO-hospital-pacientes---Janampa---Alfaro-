import { Injectable, computed, signal } from '@angular/core';
import { Paciente } from '../models/paciente';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private readonly limitePacientes = 10;
  private readonly _pacientes = signal<Paciente[]>([]);
  private readonly _idCounter = signal(1);

  readonly pacientes = computed(() => this._pacientes());
  readonly totalPacientes = computed(() => this._pacientes().length);
  readonly cuposDisponibles = computed(() => this.limitePacientes - this._pacientes().length);
  readonly limiteAlcanzado = computed(() => this._pacientes().length >= this.limitePacientes);

  agregar(paciente: Omit<Paciente, 'id'>): { ok: boolean; mensaje: string } {
    if (this.limiteAlcanzado()) {
      return { ok: false, mensaje: 'No se pueden registrar mas de 10 pacientes.' };
    }

    const nuevoPaciente: Paciente = {
      id: this._idCounter(),
      ...paciente
    };

    this._pacientes.update(lista => [...lista, nuevoPaciente]);
    this._idCounter.update(id => id + 1);

    return { ok: true, mensaje: 'Paciente registrado correctamente.' };
  }

  actualizar(id: number, cambios: Omit<Paciente, 'id'>): { ok: boolean; mensaje: string } {
    let encontrado = false;

    this._pacientes.update(lista =>
      lista.map(p => {
        if (p.id === id) {
          encontrado = true;
          return { id, ...cambios };
        }
        return p;
      })
    );

    return encontrado
      ? { ok: true, mensaje: 'Paciente actualizado correctamente.' }
      : { ok: false, mensaje: 'Paciente no encontrado.' };
  }

  eliminar(id: number): { ok: boolean; mensaje: string } {
    const listaActual = this._pacientes();
    const nuevaLista = listaActual.filter(p => p.id !== id);

    if (nuevaLista.length === listaActual.length) {
      return { ok: false, mensaje: 'Paciente no encontrado.' };
    }

    this._pacientes.set(nuevaLista);
    return { ok: true, mensaje: 'Paciente eliminado correctamente.' };
  }

  obtenerPorId(id: number): Paciente | undefined {
    return this._pacientes().find(p => p.id === id);
  }
}
