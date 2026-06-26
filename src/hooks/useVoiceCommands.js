import { useEffect, useRef } from 'react'

export function useVoiceCommands(isActive, commands) {
  const recognitionRef = useRef(null)
  const commandsRef    = useRef(commands)
  commandsRef.current  = commands

  useEffect(() => {
    if (!isActive) {
      recognitionRef.current?.stop()
      return
    }

    // Check browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous   = true  // keep listening after each result
    recognition.interimResults = false
    recognition.lang         = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const last       = event.results.length - 1
      const transcript = event.results[last][0].transcript.toLowerCase().trim()
      console.log('Voice:', transcript)

      const cmds = commandsRef.current
      if (transcript.includes('clear'))   cmds.onClear?.()
      if (transcript.includes('undo'))    cmds.onUndo?.()
      if (transcript.includes('save'))    cmds.onSave?.()
      if (transcript.includes('erase'))   cmds.onErase?.()
      if (transcript.includes('neon'))    cmds.onBrush?.('neon')
      if (transcript.includes('galaxy'))  cmds.onBrush?.('galaxy')
      if (transcript.includes('fire'))    cmds.onBrush?.('fire')
      if (transcript.includes('crystal')) cmds.onBrush?.('crystal')
      if (transcript.includes('plasma'))  cmds.onBrush?.('plasma')
      if (transcript.includes('aurora'))  cmds.onBrush?.('aurora')
      if (transcript.includes('magic'))   cmds.onBrush?.('magic')
      if (transcript.includes('hologram'))cmds.onBrush?.('hologram')
    }

    recognition.onerror = (e) => {
      // 'no-speech' is normal — just means no one spoke for a moment
      if (e.error !== 'no-speech') console.warn('Speech error:', e.error)
    }

    recognition.onend = () => {
      // Auto-restart so it keeps listening continuously
      if (isActive) {
        try { recognition.start() } catch (e) { /* already started */ }
      }
    }

    try {
      recognition.start()
    } catch (e) {
      console.warn('Could not start speech recognition:', e)
    }

    return () => {
      recognition.onend = null
      recognition.stop()
    }
  }, [isActive])
}