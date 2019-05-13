// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getFirstCallback, Mocked } from "../test/helpers";
import ToolsResourceLoader from "./toolsResourceLoader";

describe("toolsHost", () => {
    let mockResourceLoader: Mocked<ToolsResourceLoader>;
    let mockWebviewEvents: { encodeMessageForChannel: jest.Mock };

    beforeEach(() => {
        window.parent.postMessage = jest.fn();

        mockResourceLoader = {
            onResolvedUrlFromChannel: jest.fn(),
        } as Mocked<ToolsResourceLoader>;

        mockWebviewEvents = {
            encodeMessageForChannel: jest.fn(),
        };
        jest.doMock("../common/webviewEvents", () => mockWebviewEvents);
        jest.resetModules();
    });

    describe("isHostedMode", () => {
        it("returns true", async () => {
            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            expect(host.isHostedMode()).toEqual(true);
        });
    });

    describe("getPreferences", () => {
        it("calls across to webview", async () => {
            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            const mockCallback = jest.fn();
            host.getPreferences(mockCallback);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "getState",
                expect.objectContaining({ id: 0 }),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });

        it("fires callbacks on response from extension", async () => {
            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            const mockCallback = jest.fn();
            host.getPreferences(mockCallback);

            const mockCallback2 = jest.fn();
            host.getPreferences(mockCallback2);

            const expectedPref = { name: "myPref", value: "myValue" };
            const expectedArgs = { id: 0, preferences: { ...expectedPref } };
            host.onMessageFromChannel("getState", JSON.stringify(expectedArgs));
            expect(mockCallback).toHaveBeenCalledWith(expectedPref);

            const expectedPref2 = { name: "myPref2", value: "myValue2" };
            const expectedArgs2 = { id: 1, preferences: { ...expectedPref2 } };
            host.onMessageFromChannel("getState", JSON.stringify(expectedArgs2));
            expect(mockCallback2).toHaveBeenCalledWith(expectedPref2);
        });
    });

    describe("setPreferences", () => {
        it("calls across to webview", async () => {
            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            const expectedPref = {
                name: "myPreference",
                value: "myValue",
            };
            host.setPreference(expectedPref.name, expectedPref.value);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "setState",
                expectedPref,
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });
    });

    describe("recordEnumeratedHistogram", () => {
        it("calls across to extension", async () => {
            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            const expectedTelemetry = {
                data: 1000,
                event: "enumerated",
                name: "DevTools.InspectElement",
            };
            host.recordEnumeratedHistogram(expectedTelemetry.name, expectedTelemetry.data, 0);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "telemetry",
                expect.objectContaining(expectedTelemetry),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });
    });

    describe("recordPerformanceHistogram", () => {
        it("calls across to extension", async () => {
            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            const expectedTelemetry = {
                data: 500,
                event: "performance",
                name: "DevTools.Launch.Console",
            };
            host.recordPerformanceHistogram(expectedTelemetry.name, expectedTelemetry.data);

            expect(mockWebviewEvents.encodeMessageForChannel).toHaveBeenCalledWith(
                expect.any(Function),
                "telemetry",
                expect.objectContaining(expectedTelemetry),
            );

            // Ensure that the encoded message is actually passed over to the extension
            const expectedPostedMessage = "encodedMessage";
            const postMessage = getFirstCallback(mockWebviewEvents.encodeMessageForChannel);
            postMessage.callback.call(postMessage.thisObj, expectedPostedMessage);
            expect(window.parent.postMessage).toHaveBeenCalledWith(expectedPostedMessage, "*");
        });
    });

    describe("onMessageFromChannel", () => {
        it("calls onResolvedUrlFromChannel on getUrl message", async () => {
            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            const expectedArgs = { id: 0, content: "some content" };
            host.onMessageFromChannel("getUrl", JSON.stringify(expectedArgs));

            expect(mockResourceLoader.onResolvedUrlFromChannel).toHaveBeenCalledWith(
                expectedArgs.id,
                expectedArgs.content,
            );
        });

        it("calls onMessageFromChannel on websocket message", async () => {
            const mockToolsWS = {
                instance: {
                    onMessageFromChannel: jest.fn(),
                },
            };
            jest.doMock("./toolsWebSocket", () => mockToolsWS);

            const { default: toolsHost } = await import("./toolsHost");
            const host = new toolsHost(mockResourceLoader);

            const expectedArgs = { event: "message", message: "some websocket message" };
            host.onMessageFromChannel("websocket", JSON.stringify(expectedArgs));

            expect(mockToolsWS.instance.onMessageFromChannel).toHaveBeenCalledWith(
                expectedArgs.event,
                expectedArgs.message,
            );
        });
    });
});