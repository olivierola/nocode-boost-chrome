import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Setting up WebSocket connection to OpenAI Realtime API...');

    // Check if this is a WebSocket upgrade request
    if (req.headers.get('upgrade') !== 'websocket') {
      return new Response('This endpoint requires WebSocket connection', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = async () => {
      console.log('Client WebSocket connected');
      
      try {
        // Connect to OpenAI Realtime API
        console.log('Connecting to OpenAI Realtime API...');
        const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        });

        let sessionCreated = false;

        openaiWs.onopen = () => {
          console.log('Connected to OpenAI Realtime API');
        };

        openaiWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received from OpenAI:', data.type);

            // Send session update after session.created
            if (data.type === 'session.created' && !sessionCreated) {
              console.log('Session created, sending session update...');
              sessionCreated = true;
              
              const sessionUpdate = {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'],
                  instructions: 'Tu es un assistant IA spécialisé dans les outils NoCode. Tu aides les utilisateurs à créer et améliorer leurs projets avec des conseils pratiques et des recommandations techniques.',
                  voice: 'alloy',
                  input_audio_format: 'pcm16',
                  output_audio_format: 'pcm16',
                  input_audio_transcription: {
                    model: 'whisper-1'
                  },
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1000
                  },
                  tools: [
                    {
                      type: 'function',
                      name: 'enhance_prompt',
                      description: 'Améliore un prompt pour les outils NoCode',
                      parameters: {
                        type: 'object',
                        properties: {
                          prompt: { type: 'string' }
                        },
                        required: ['prompt']
                      }
                    },
                    {
                      type: 'function',
                      name: 'generate_plan',
                      description: 'Génère un plan de projet structuré',
                      parameters: {
                        type: 'object',
                        properties: {
                          projectIdea: { type: 'string' },
                          projectName: { type: 'string' }
                        },
                        required: ['projectIdea', 'projectName']
                      }
                    }
                  ],
                  tool_choice: 'auto',
                  temperature: 0.8,
                  max_response_output_tokens: 2000
                }
              };

              openaiWs.send(JSON.stringify(sessionUpdate));
              console.log('Session update sent');
            }

            // Forward message to client
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }

          } catch (error) {
            console.error('Error processing OpenAI message:', error);
          }
        };

        openaiWs.onerror = (error) => {
          console.error('OpenAI WebSocket error:', error);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: 'Connection to OpenAI failed' 
            }));
          }
        };

        openaiWs.onclose = () => {
          console.log('OpenAI WebSocket closed');
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        };

        // Handle messages from client
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received from client:', data.type);

            // Handle function calls
            if (data.type === 'response.function_call_arguments.done') {
              console.log('Function call completed:', data.name, data.arguments);
              
              // Execute function and send result back
              const executeFunction = async () => {
                try {
                  let result = {};
                  
                  if (data.name === 'enhance_prompt') {
                    const args = JSON.parse(data.arguments);
                    // Simulate prompt enhancement
                    result = { enhanced_prompt: `Prompt amélioré: ${args.prompt}` };
                  } else if (data.name === 'generate_plan') {
                    const args = JSON.parse(data.arguments);
                    // Simulate plan generation
                    result = { plan: `Plan généré pour ${args.projectName}: ${args.projectIdea}` };
                  }

                  // Send function result back to OpenAI
                  const functionResult = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: data.call_id,
                      output: JSON.stringify(result)
                    }
                  };

                  openaiWs.send(JSON.stringify(functionResult));
                  openaiWs.send(JSON.stringify({ type: 'response.create' }));

                } catch (error) {
                  console.error('Function execution error:', error);
                }
              };

              executeFunction();
            } else {
              // Forward other messages to OpenAI
              if (openaiWs.readyState === WebSocket.OPEN) {
                openaiWs.send(event.data);
              }
            }

          } catch (error) {
            console.error('Error processing client message:', error);
          }
        };

        socket.onclose = () => {
          console.log('Client WebSocket closed');
          if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.close();
          }
        };

        socket.onerror = (error) => {
          console.error('Client WebSocket error:', error);
          if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.close();
          }
        };

      } catch (error) {
        console.error('Error setting up OpenAI connection:', error);
        socket.close();
      }
    };

    return response;

  } catch (error) {
    console.error('Error in realtime-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});