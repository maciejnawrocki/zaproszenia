document.addEventListener('DOMContentLoaded', () => {
    const formContainer = document.getElementById('formContainer');
    const dataForm = document.getElementById('dataForm');
    const loadingMessage = document.getElementById('loadingMessage');
    const statusMessage = document.getElementById('statusMessage');
    const recordIdInput = document.getElementById('recordIdInput'); // Ukryte pole

    // --- Konfiguracja ---
    // Zastąp tym adresem URL wdrożonej aplikacji Google Apps Script
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznbkAeTJaVG0tbloGrfS-hjJ8tWrnZUf8xJ16FEvY/dev';

    // --- Sprawdzanie parametru URL dla edycji ---
    const urlParams = new URLSearchParams(window.location.search);
    const recordIdFromUrl = urlParams.get('recordId'); // Oczekujemy parametru ?recordId=WARTOSC_ID

    if (recordIdFromUrl) {
        recordIdInput.value = recordIdFromUrl; // Ustaw ID w ukrytym polu
        loadDataForEditing(recordIdFromUrl);
    } else {
        statusMessage.textContent = 'Gotowy do dodania nowego wpisu.';
    }

    // --- Ładowanie danych do edycji ---
    async function loadDataForEditing(recordId) {
        loadingMessage.textContent = 'Ładowanie danych do edycji...';
        loadingMessage.classList.remove('hidden');
        statusMessage.textContent = '';

        try {
            const response = await fetch(`${SCRIPT_URL}?action=getData&recordId=${encodeURIComponent(recordId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Błąd serwera: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                // recordIdInput.value już ustawione z URL
                document.getElementById('field1').value = result.data.field1 || '';
                document.getElementById('field2').value = result.data.field2 || '';
                document.getElementById('field3').value = result.data.field3 || '';
                statusMessage.textContent = 'Dane załadowane pomyślnie. Możesz je edytować.';
                statusMessage.className = 'success';
            } else if (result.message === "No data found") {
                statusMessage.textContent = `Nie znaleziono danych dla ID: ${recordId}. Możesz dodać nowy wpis z tym ID lub usunąć parametr z URL, aby dodać całkowicie nowy rekord.`;
                statusMessage.className = ''; // neutralny
            } else {
                throw new Error(result.message || 'Nie udało się załadować danych.');
            }
        } catch (error) {
            console.error('Błąd podczas ładowania danych:', error);
            statusMessage.textContent = `Błąd ładowania danych: ${error.message}`;
            statusMessage.className = 'error';
        } finally {
            loadingMessage.classList.add('hidden');
        }
    }

    // --- Obsługa wysyłania formularza ---
    dataForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        loadingMessage.textContent = 'Zapisywanie danych...';
        loadingMessage.classList.remove('hidden');
        statusMessage.textContent = '';

        const formData = new FormData(dataForm);
        const data = Object.fromEntries(formData.entries());

        // 'recordIdInput' zawiera ID z URL (jeśli było) lub jest puste.
        // Nazwijmy go 'recordId' dla payloadu, bo tak oczekuje Apps Script.
        data.recordId = data.recordIdInput;
        delete data.recordIdInput; // Usuwamy oryginalne pole z obiektu data

        // Jeśli data.recordId jest puste, Apps Script potraktuje to jako nowy wpis
        // i potencjalnie nie zapisze nic w kolumnie RecordID, chyba że wygeneruje ID po stronie serwera.
        // Jeśli chcesz, aby nowe wpisy miały jakieś ID generowane po stronie klienta (np. UUID),
        // musiałbyś dodać taką logikę tutaj, jeśli recordIdFromUrl nie istnieje.
        // Na razie, jeśli recordIdFromUrl nie było, data.recordId będzie puste.

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                // Musimy ręcznie opakować dane w strukturę, której oczekuje Apps Script
                body: JSON.stringify({ action: 'saveData', payload: data }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.message || `Błąd serwera: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                statusMessage.textContent = result.message || 'Dane zapisane pomyślnie!';
                statusMessage.className = 'success';
                if (result.newRecordId && !recordIdInput.value) { // Jeśli Apps Script zwrócił ID dla nowego rekordu
                    recordIdInput.value = result.newRecordId;
                    // Opcjonalnie: zaktualizuj URL, aby odzwierciedlał ID nowego rekordu
                    // window.history.pushState({}, '', `?recordId=${result.newRecordId}`);
                }
                if (!recordIdFromUrl && !result.newRecordId) { // Jeśli to był nowy wpis, a Apps Script nie zwrócił ID
                    // dataForm.reset(); // Możesz zresetować formularz dla kolejnego nowego wpisu
                }
            } else {
                throw new Error(result.message || 'Nie udało się zapisać danych.');
            }
        } catch (error) {
            console.error('Błąd podczas zapisywania danych:', error);
            statusMessage.textContent = `Błąd zapisu danych: ${error.message}`;
            statusMessage.className = 'error';
        } finally {
            loadingMessage.classList.add('hidden');
        }
    });
});