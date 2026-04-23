// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface ToolConfig {
  readonly toolName: string;
  readonly allowed?: boolean;
  readonly settings?: Record<string, unknown>;
}
