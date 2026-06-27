import { useEffect, useRef } from 'react'

export function useVoiceCommands(isActive, commands) {
  const recognitionRef = useRef(null)
  const commandsRef    = useRef(commands)
  const activeRef      = useRef(isActive)

  commandsRef.current = commands
  activeRef.current   = isActive

  useEffect(() => {
    if (!isActive) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
        recognitionRef.current = null
      }
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser. Try Chrome.')
      return
    }

    // Don't create a new instance if one already exists
    if (recognitionRef.current) return

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous      = true
    recognition.interimResults  = false
    recognition.lang            = 'en-US'
    recognition.maxAlternatives = 3  // check multiple alternatives

    recognition.onstart = () => {
      console.log('🎤 Voice commands active — try saying "clear", "undo", "fire"')
    }

    recognition.onresult = (event) => {
      // Check all alternatives for each result
      for (let r = event.resultIndex; r < event.results.length; r++) {
        for (let a = 0; a < event.results[r].length; a++) {
          const transcript = event.results[r][a].transcript.toLowerCase().trim()
          console.log('🎤 Heard:', transcript)

          const cmds = commandsRef.current
          if (transcript.includes('clear'))    { cmds.onClear?.();           return }
          if (transcript.includes('undo'))     { cmds.onUndo?.();            return }
          if (transcript.includes('save'))     { cmds.onSave?.();            return }
          if (transcript.includes('neon'))     { cmds.onBrush?.('neon');     return }
          if (transcript.includes('galaxy'))   { cmds.onBrush?.('galaxy');   return }
          if (transcript.includes('fire'))     { cmds.onBrush?.('fire');     return }
          if (transcript.includes('crystal'))  { cmds.onBrush?.('crystal');  return }
          if (transcript.includes('plasma'))   { cmds.onBrush?.('plasma');   return }
          if (transcript.includes('aurora'))   { cmds.onBrush?.('aurora');   return }
          if (transcript.includes('magic'))    { cmds.onBrush?.('magic');    return }
          if (transcript.includes('hologram')) { cmds.onBrush?.('hologram'); return }
          if (transcript.includes('lightning')){ cmds.onBrush?.('lightning');return }
        }
      }
    }

    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e.error)
      if (e.error === 'not-allowed') {
        console.error('Microphone permission denied for speech recognition.')
      }
      if (e.error === 'network') {
        console.warn('Network error — speech recognition requires internet connection.')
      }
    }

    recognition.onend = () => {
      // Auto restart only if still supposed to be active
      if (activeRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch (e) {
            // Already started — ignore
          }
        }, 300)
      }
    }

    try {
      recognition.start()
    } catch (e) {
      console.error('Could not start speech recognition:', e)
    }

    return () => {
      activeRef.current = false
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        try { recognitionRef.current.stop() } catch (e) {}
        recognitionRef.current = null
      }
    }
  }, [isActive])
}