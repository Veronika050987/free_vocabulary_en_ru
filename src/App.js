import { React, useState, useEffect, useRef } from "react";
import Axios from "axios";
import './App.css';
import { FaSearch } from "react-icons/fa";
import { FcSpeaker } from "react-icons/fc";
import debounce from 'lodash.debounce'; // Импортируем debounce

function App() {
  const [data, setData] = useState(""); // Английские данные (слово, фонетика, определения)
  const [searchWord, setSearchWord] = useState("");
  const [russianTranslation, setRussianTranslation] = useState(""); // Состояние для русского перевода слова
  const [translatedTextResult, setTranslatedTextResult] = useState(''); // Состояние для результата перевода отдельного текста
  const [textToTranslate, setTextToTranslate] = useState(''); // Состояние для ввода текста в блоке перевода

  const libreTranslateApiUrl = 'https://libretranslate.com/translate'; // Публичный инстанс LibreTranslate

  const debounceTranslate = useRef();

  useEffect(() => {
    // Инициализируем debounce при первом рендере
    debounceTranslate.current = debounce((text) => {
      if (text) {
        // Вызываем функцию перевода с указанием целевого состояния
        translateText(text, 'en', 'ru', setTranslatedTextResult);
      } else {
        setTranslatedTextResult(''); // Очищаем, если текст пуст
      }
    }, 500); // Задержка в 500 миллисекунд

    return () => {
      // Очищаем debounce при размонтировании компонента
      debounceTranslate.current.cancel();
    };
  }, []); // Пустой массив зависимостей означает, что эффект выполнится один раз при монтировании

  // Обработчик изменения текста в textarea, теперь с debounce
  const handleTextChange = (e) => {
    setTextToTranslate(e.target.value);
    debounceTranslate.current(e.target.value); // Вызываем debounce-версию переводчика
  };
  // --- Конец debounce ---

  async function getWordInfo() {
    setData("");
    setRussianTranslation("");
    setTranslatedTextResult('');
    setTextToTranslate(searchWord);
    setTranslatedTextResult('');

    const englishApiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`;

    try {
      const englishResponse = await Axios.get(englishApiUrl);
      const englishData = englishResponse.data[0];
      setData(englishData);
      await translateText(searchWord, 'en', 'ru', setRussianTranslation);
    } catch (error) {
      console.error("Error fetching word info:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      }
      setData("");
      setRussianTranslation("");
      setTranslatedTextResult("");
    }
  }

  async function translateText(text, sourceLang, targetLang, setState) {
      if (!text) {
          setState(''); // Очищаем состояние, если текст пуст
          return;
      }
      try {
          // Добавим небольшую задержку перед запросом, чтобы избежать слишком частых вызовов
          // Это может помочь, если debounce не полностью решает проблему
          await new Promise(resolve => setTimeout(resolve, 100));

          const translateResponse = await Axios.post(libreTranslateApiUrl, {
              q: text,
              source: sourceLang,
              target: targetLang,
              format: 'text'
          });

          if (translateResponse.data && translateResponse.data.translatedText) {
              setState(translateResponse.data.translatedText);
              console.log(`Translation successful (${sourceLang} to ${targetLang}):`, translateResponse.data.translatedText);
          } else {
              console.warn(`No translation found by LibreTranslate for "${text}" from ${sourceLang} to ${targetLang}.`);
              setState('');
          }
      } catch (error) {
          console.error(`Error translating text from ${sourceLang} to ${targetLang}:`, error);
          if (error.response) {
              console.error("Error response data:", error.response.data);
              console.error("Error response status:", error.response.status);
              if (error.response.status === 429) {
                // Здесь можно показать пользователю сообщение о слишком частых запросах
                alert("Слишком много запросов. Попробуйте позже.");
              }
          }
          setState('');
      }
  }

  function playAudio() {
    if (data && data.phonetics && data.phonetics[0] && data.phonetics[0].audio) {
      let audio = new Audio(data.phonetics[0].audio);
      audio.play();
    } else {
      console.warn("Audio is not available for this word.");
    }
  }

  // Обработчик для кнопки "Перевести текст" (теперь он просто инициирует перевод, если debounce не сработал)
  // Кнопка "Перевести текст" теперь в основном нужна для первого ввода, если debounce отключен
  const handleManualTranslateClick = async () => {
    if (!textToTranslate) return;
    // Отключаем debounce временно, чтобы кнопка сработала немедленно
    debounceTranslate.current.cancel(); // Отменяем все запланированные debounce-вызовы
    await translateText(textToTranslate, 'en', 'ru', setTranslatedTextResult);
    // Перезапускаем debounce после ручного перевода
    debounceTranslate.current = debounce((text) => {
      if (text) {
        translateText(text, 'en', 'ru', setTranslatedTextResult);
      } else {
        setTranslatedTextResult('');
      }
    }, 500);
  };

  return (
    <div className="App">
      <h1>Free Dictionary</h1>
      <div className="searchBox">
        <input
          type="text"
          placeholder="Search..."
          onChange={(e) => {
            setSearchWord(e.target.value);
          }}
        />
        <button
          onClick={() => {
            getWordInfo();
          }}
          disabled={!searchWord}
        >
          <FaSearch size="20px" />
        </button>
      </div>

      {data && (
        <div className="showResults">
          <h2>
            {data.word}{" "}
            {data.phonetics && data.phonetics[0] && data.phonetics[0].audio && (
              <button onClick={playAudio}>
                <FcSpeaker size="26px" />
              </button>
            )}
          </h2>

          <h4>Parts of speech:</h4>
          {data.meanings && data.meanings[0] && (
            <p>{data.meanings[0].partOfSpeech}</p>
          )}

          <h4>Definition (English):</h4>
          {data.meanings && data.meanings[0] && data.meanings[0].definitions && data.meanings[0].definitions[0] && (
            <p>{data.meanings[0].definitions[0].definition}</p>
          )}

          <h4>Example (English):</h4>
          {data.meanings && data.meanings[0] && data.meanings[0].definitions && data.meanings[0].definitions[0] && (
            <p>{data.meanings[0].definitions[0].example}</p>
          )}

          {russianTranslation && (
            <>
              <h4>Перевод слова (Русский) <span style={{fontSize: '0.8em', color: '#888'}}>(через LibreTranslate)</span>:</h4>
              <p>{russianTranslation}</p>
              <p style={{fontSize: '0.9em', color: '#888', marginTop: '5px'}}>
                * LibreTranslate не предоставляет примеры использования слов.
              </p>
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Переводчик текста</h3>
        <textarea
          rows="4"
          cols="50"
          value={textToTranslate}
          onChange={handleTextChange} // Используем обработчик с debounce
          placeholder="Введите текст для перевода с английского на русский..."
        />
        <br/>
        <button onClick={handleManualTranslateClick} disabled={!textToTranslate}>
          Перевести текст
        </button>
        {translatedTextResult && (
          <div style={{ marginTop: '15px' }}>
            <h4>Переведенный текст:</h4>
            <p>{translatedTextResult}</p>
            <p style={{fontSize: '0.9em', color: '#888'}}>
              * Перевод предоставлен LibreTranslate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;