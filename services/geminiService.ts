import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { FilterCriteria, Station } from '../types';

// Define tools for the model to interact with the app state
const updateMapTool: FunctionDeclaration = {
  name: "update_map_view",
  description: "Move the map to a specific location based on user request (e.g., 'show me stations near Sagrada Familia'). Use internal knowledge for coordinates of landmarks in Barcelona.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      latitude: { type: Type.NUMBER, description: "Latitude of the target location" },
      longitude: { type: Type.NUMBER, description: "Longitude of the target location" },
      zoom: { type: Type.NUMBER, description: "Zoom level (12-18). Default 15." },
      locationName: { type: Type.STRING, description: "Name of the location found" }
    },
    required: ["latitude", "longitude", "locationName"]
  }
};

const filterStationsTool: FunctionDeclaration = {
  name: "filter_stations",
  description: "Filter the visible bike stations based on criteria.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      minBikes: { type: Type.NUMBER, description: "Minimum number of available bikes required" },
      onlyEbikes: { type: Type.BOOLEAN, description: "If true, only show stations with electric bikes" },
      minSlots: { type: Type.NUMBER, description: "Minimum number of empty return slots required" }
    },
  }
};

const appTools: Tool[] = [
  { functionDeclarations: [updateMapTool, filterStationsTool] }
];

export class GeminiAssistant {
  private ai: GoogleGenAI;
  private modelId = 'gemini-2.5-flash';
  private chatSession: any;

  constructor() {
    // API Key must be from process.env.API_KEY per strict guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  startChat() {
    this.chatSession = this.ai.chats.create({
      model: this.modelId,
      config: {
        systemInstruction: `You are an intelligent assistant for Bicing, Barcelona's bike sharing system.
        Your goal is to help users find bikes, parking slots, or explore the city's mobility.
        
        Capabilities:
        1. You can move the map to specific landmarks in Barcelona using 'update_map_view'. You know the coordinates of major places.
        2. You can filter the stations displayed using 'filter_stations'.
        
        Guidelines:
        - Be concise, helpful, and friendly.
        - Answer in Spanish (or the user's language, default to Spanish).
        - If a user asks for "bikes near X", first move the map to X, then mention you are showing stations there.
        - When filtering, explain what you did (e.g., "Here are stations with at least 5 bikes.").
        `,
        tools: appTools,
      },
    });
  }

  async sendMessage(
    message: string, 
    onToolCall: (name: string, args: any) => Promise<any>
  ): Promise<string> {
    if (!this.chatSession) this.startChat();

    try {
      const result = await this.chatSession.sendMessage({ message });
      
      // Check for function calls
      const calls = result.functionCalls;
      if (calls && calls.length > 0) {
        const functionResponses = [];
        
        for (const call of calls) {
          const apiResponse = await onToolCall(call.name, call.args);
          functionResponses.push({
            name: call.name,
            response: { result: apiResponse },
            id: call.id // Important to include the ID if present (though new SDK handles it mostly via order/structure, explicit ID is safer if available)
          });
        }
        
        // Send tool response back to model to get final text
        const postToolResult = await this.chatSession.sendMessage(functionResponses);
        return postToolResult.text;
      }

      return result.text;
    } catch (error) {
      console.error("Gemini interaction error:", error);
      return "Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.";
    }
  }
}
