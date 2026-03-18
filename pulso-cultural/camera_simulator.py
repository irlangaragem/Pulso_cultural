import requests
import time
import random

API_URL = "http://localhost:3333/exhibitions"

def simulate_camera():
    print("Iniciando simulador de câmera (YOLOv8 Mock)...")
    while True:
        # Simulate an entry or exit
        count_type = random.choice(["ENTRADA", "SAIDA"])
        print(f"Detectado: {count_type}")
        
        try:
            # We don't have a direct /api/counts yet in the controller, 
            # let's add it or use a generic approach.
            # For now, let's just make sure the backend can handle it.
            requests.post("http://localhost:3333/checkins/simulate-count", json={
                "type": count_type,
                "exhibitionId": "default-exhibition"
            })
        except Exception as e:
            print(f"Erro ao enviar: {e}")
            
        time.sleep(random.randint(5, 15))

if __name__ == "__main__":
    simulate_camera()
