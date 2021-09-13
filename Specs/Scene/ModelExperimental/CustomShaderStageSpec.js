import {
  AttributeType,
  CustomShader,
  CustomShaderStage,
  LightingModel,
  ModelAlphaOptions,
  ModelLightingOptions,
  ShaderBuilder,
  UniformType,
  VaryingType,
  _shadersCustomShaderStageVS,
  _shadersCustomShaderStageFS,
} from "../../../Source/Cesium.js";
import ShaderBuilderTester from "../../ShaderBuilderTester.js";

describe("Scene/ModelExperimental/CustomShaderStage", function () {
  var primitive = {
    attributes: [
      {
        semantic: "POSITION",
        type: AttributeType.VEC3,
      },
      {
        semantic: "NORMAL",
        type: AttributeType.VEC3,
      },
      {
        semantic: "TEXCOORD",
        setIndex: 0,
        type: AttributeType.VEC2,
      },
    ],
  };

  var primitiveWithCustomAttributes = {
    attributes: [
      {
        semantic: "POSITION",
        type: AttributeType.VEC3,
      },
      {
        name: "_TEMPERATURE",
        type: AttributeType.SCALAR,
      },
    ],
  };

  var emptyVertexShader =
    "void vertexMain(VertexInput vsInput, inout vec3 position) {}";
  var emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";
  var emptyShader = new CustomShader({
    vertexShaderText: emptyVertexShader,
    fragmentShaderText: emptyFragmentShader,
  });

  var attributesVSStructId = "AttributesVS";
  var attributesFSStructId = "AttributesFS";
  var vertexInputStructId = "VertexInput";
  var fragmentInputStructId = "FragmentInput";
  var initializeVSFunctionId = "initializeInputStructVS";
  var initializeFSFunctionId = "initializeInputStructFS";
  var initializeVSSignature =
    "void initializeInputStruct(out VertexInput vsInput, ProcessedAttributes attributes)";
  var initializeFSSignature =
    "void initializeInputStruct(out FragmentInput fsInput, ProcessedAttributes attributes)";

  it("sets defines in the shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: emptyShader,
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);
    ShaderBuilderTester.expectHasFragmentDefines(shaderBuilder, [
      "HAS_CUSTOM_FRAGMENT_SHADER",
      "CUSTOM_SHADER_MODIFY_MATERIAL",
    ]);
  });

  it("adds uniforms from the custom shader", function () {
    var uniforms = {
      u_time: {
        type: UniformType.FLOAT,
      },
      u_enableAnimation: {
        type: UniformType.BOOL,
      },
    };
    var customShader = new CustomShader({
      uniforms: uniforms,
      vertexShaderText: emptyVertexShader,
      fragmentShaderText: emptyFragmentShader,
    });
    var model = {
      customShader: customShader,
    };
    var uniformMap = {};
    var shaderBuilder = new ShaderBuilder();

    var renderResources = {
      shaderBuilder: shaderBuilder,
      uniformMap: uniformMap,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexUniforms(shaderBuilder, [
      "uniform bool u_enableAnimation;",
      "uniform float u_time;",
    ]);

    ShaderBuilderTester.expectHasFragmentUniforms(shaderBuilder, [
      "uniform bool u_enableAnimation;",
      "uniform float u_time;",
    ]);

    expect(renderResources.uniformMap).toEqual(customShader.uniformMap);
  });

  it("adds varying declarations from the custom shader", function () {
    var varyings = {
      v_distanceFromCenter: VaryingType.FLOAT,
      v_computedMatrix: VaryingType.MAT3,
    };
    var customShader = new CustomShader({
      vertexShaderText: emptyVertexShader,
      fragmentShaderText: emptyFragmentShader,
      varyings: varyings,
    });
    var model = {
      customShader: customShader,
    };
    var shaderBuilder = new ShaderBuilder();

    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVaryings(shaderBuilder, [
      "varying float v_distanceFromCenter;",
      "varying mat2 v_computedMatrix;",
    ]);
  });

  it("overrides the lighting model if specified in the custom shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: emptyFragmentShader,
        lightingModel: LightingModel.PBR,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(renderResources.lightingOptions.lightingModel).toBe(
      LightingModel.PBR
    );
  });

  it("generates shader code from built-in attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    vec3 normal = vsInput.attributes.normal;",
          "    vec2 texCoord = vsInput.attributes.texCoord_0;",
          "    position = vsInput.attributes.positionMC;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    vec3 positionMC = fsInput.attributes.positionMC;",
          "    vec3 normal = fsInput.attributes.normal;",
          "    vec2 texCoord = fsInput.attributes.texCoord_0;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      attributesVSStructId,
      "Attributes",
      ["    vec3 positionMC;", "    vec3 normal;", "    vec2 texCoord_0;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      attributesFSStructId,
      "Attributes",
      ["    vec3 positionMC;", "    vec3 normal;", "    vec2 texCoord_0;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      vertexInputStructId,
      "VertexInput",
      ["    Attributes attributes;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      fragmentInputStructId,
      "FragmentInput",
      ["    Attributes attributes;"]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      initializeVSFunctionId,
      initializeVSSignature,
      [
        "    vsInput.attributes.positionMC = attributes.positionMC;",
        "    vsInput.attributes.normal = attributes.normal;",
        "    vsInput.attributes.texCoord_0 = attributes.texCoord_0;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      initializeFSFunctionId,
      initializeFSSignature,
      [
        "    fsInput.attributes.positionMC = attributes.positionMC;",
        "    fsInput.attributes.normal = attributes.normal;",
        "    fsInput.attributes.texCoord_0 = attributes.texCoord_0;",
      ]
    );
  });

  it("generates shader code for custom attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    float temperature = vsInput.attributes.temperature;",
          "    position = vsInput.attributes.positionMC;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    float temperature = fsInput.attributes.temperature;",
          "    vec3 positionMC = fsInput.attributes.positionMC;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitiveWithCustomAttributes);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      attributesVSStructId,
      "Attributes",
      ["    vec3 positionMC;", "    float temperature;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      attributesFSStructId,
      "Attributes",
      ["    vec3 positionMC;", "    float temperature;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      vertexInputStructId,
      "VertexInput",
      ["    Attributes attributes;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      fragmentInputStructId,
      "FragmentInput",
      ["    Attributes attributes;"]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      initializeVSFunctionId,
      initializeVSSignature,
      [
        "    vsInput.attributes.positionMC = attributes.positionMC;",
        "    vsInput.attributes.temperature = attributes.temperature;",
      ]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      initializeFSFunctionId,
      initializeFSSignature,
      [
        "    fsInput.attributes.positionMC = attributes.positionMC;",
        "    fsInput.attributes.temperature = attributes.temperature;",
      ]
    );
  });

  it("only generates input lines for attributes that are used", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    position = 2.0 * vsInput.attributes.positionMC - 1.0;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    float temperature = fsInput.attributes.temperature",
          "    material.diffuse = vec3(temperature / 90.0, 0.0, 0.0);",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitiveWithCustomAttributes);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      attributesVSStructId,
      "Attributes",
      ["    vec3 positionMC;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      attributesFSStructId,
      "Attributes",
      ["    float temperature;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      vertexInputStructId,
      "VertexInput",
      ["    Attributes attributes;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      fragmentInputStructId,
      "FragmentInput",
      ["    Attributes attributes;"]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      initializeVSFunctionId,
      initializeVSSignature,
      ["    vsInput.attributes.positionMC = attributes.positionMC;"]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      initializeFSFunctionId,
      initializeFSSignature,
      ["    fsInput.attributes.temperature = attributes.temperature;"]
    );
  });

  it("generates the shader lines in the correct order", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: emptyShader,
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.structIds).toEqual([
      attributesVSStructId,
      vertexInputStructId,
    ]);
    expect(shaderBuilder._fragmentShaderParts.structIds).toEqual([
      attributesFSStructId,
      fragmentInputStructId,
    ]);

    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
      "#line 0",
      emptyVertexShader,
      _shadersCustomShaderStageVS,
    ]);

    ShaderBuilderTester.expectFragmentLinesEqual(shaderBuilder, [
      "#line 0",
      emptyFragmentShader,
      _shadersCustomShaderStageFS,
    ]);
  });

  it("does not add positions in other coordinate systems if not needed", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: emptyShader,
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      fragmentInputStructId,
      "FragmentInput",
      ["    Attributes attributes;"]
    );
  });

  it("configures positions in other coordinate systems when present in the shader", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = fsInput.positionMC;",
          "    material.specular = fsInput.positionWC;",
          "    material.normal = fsInput.positionEC;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "COMPUTE_POSITION_WC",
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      attributesVSStructId,
      "Attributes",
      []
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      attributesFSStructId,
      "Attributes",
      []
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      vertexInputStructId,
      "VertexInput",
      ["    Attributes attributes;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      fragmentInputStructId,
      "FragmentInput",
      [
        "    Attributes attributes;",
        "    vec3 positionMC;",
        "    vec3 positionWC;",
        "    vec3 positionEC;",
      ]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      initializeVSFunctionId,
      initializeVSSignature,
      []
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      initializeFSFunctionId,
      initializeFSSignature,
      [
        "    fsInput.positionMC = attributes.positionMC;",
        "    fsInput.positionWC = attributes.positionWC;",
        "    fsInput.positionEC = attributes.positionEC;",
      ]
    );
  });

  it("infers default values for built-in attributes", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    vec2 texCoords = vsInput.attributes.texCoord_1;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = vec3(fsInput.attributes.tangent);",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      attributesVSStructId,
      "Attributes",
      ["    vec2 texCoord_1;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      attributesFSStructId,
      "Attributes",
      ["    vec3 tangent;"]
    );

    ShaderBuilderTester.expectHasVertexStruct(
      shaderBuilder,
      vertexInputStructId,
      "VertexInput",
      ["    Attributes attributes;"]
    );
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      fragmentInputStructId,
      "FragmentInput",
      ["    Attributes attributes;"]
    );

    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      initializeVSFunctionId,
      initializeVSSignature,
      ["    vsInput.attributes.texCoord_1 = vec2(0.0);"]
    );
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      initializeFSFunctionId,
      initializeFSSignature,
      ["    fsInput.attributes.tangent = vec3(1.0, 0.0, 0.0);"]
    );
  });

  it("handles incompatible primitives gracefully", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 position)",
          "{",
          "    vec3 texCoords = vsInput.attributes.color_0;",
          "}",
        ].join("\n"),
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse *= fsInput.attributes.notAnAttribute;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    spyOn(CustomShaderStage, "_oneTimeWarning");

    CustomShaderStage.process(renderResources, primitive);

    // once for the vertex shader, once for the fragment shader
    expect(CustomShaderStage._oneTimeWarning.calls.count()).toBe(2);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([]);
  });

  it("disables vertex shader if vertexShaderText is not provided", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        fragmentShaderText: emptyFragmentShader,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      uniformMap: {},
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([
      "HAS_CUSTOM_FRAGMENT_SHADER",
      "CUSTOM_SHADER_MODIFY_MATERIAL",
    ]);

    expect(shaderBuilder._vertexShaderParts.shaderLines).toEqual([]);
    var fragmentShaderIndex = shaderBuilder._fragmentShaderParts.shaderLines.indexOf(
      emptyFragmentShader
    );
    expect(fragmentShaderIndex).not.toBe(-1);
  });

  it("disables fragment shader if fragmentShaderText is not provided", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        vertexShaderText: emptyVertexShader,
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
    };

    CustomShaderStage.process(renderResources, primitive);

    expect(shaderBuilder._vertexShaderParts.defineLines).toEqual([
      "HAS_CUSTOM_VERTEX_SHADER",
    ]);
    expect(shaderBuilder._fragmentShaderParts.defineLines).toEqual([]);

    var vertexShaderIndex = shaderBuilder._vertexShaderParts.shaderLines.indexOf(
      emptyVertexShader
    );
    expect(vertexShaderIndex).not.toBe(-1);
    expect(shaderBuilder._fragmentShaderParts.shaderLines).toEqual([]);
  });

  it("disables custom shader if neither fragmentShaderText nor vertexShaderText are provided", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader(),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
      uniformMap: {},
    };

    CustomShaderStage.process(renderResources, primitive);

    // Essentially the shader stage is skipped, so nothing should be updated
    expect(shaderBuilder).toEqual(new ShaderBuilder());
    expect(renderResources.uniformMap).toEqual({});
    expect(renderResources.lightingOptions).toEqual(new ModelLightingOptions());
  });

  it("handles fragment-only custom shader that computes positionWC", function () {
    var shaderBuilder = new ShaderBuilder();
    var model = {
      customShader: new CustomShader({
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = fsInput.positionWC;",
          "}",
        ].join("\n"),
      }),
    };
    var renderResources = {
      shaderBuilder: shaderBuilder,
      model: model,
      lightingOptions: new ModelLightingOptions(),
      alphaOptions: new ModelAlphaOptions(),
    };

    CustomShaderStage.process(renderResources, primitive);

    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "COMPUTE_POSITION_WC",
    ]);

    expect(shaderBuilder._vertexShaderParts.structIds).toEqual([]);
    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      attributesFSStructId,
      "Attributes",
      []
    );

    ShaderBuilderTester.expectHasFragmentStruct(
      shaderBuilder,
      fragmentInputStructId,
      "FragmentInput",
      ["    Attributes attributes;", "    vec3 positionWC;"]
    );

    expect(shaderBuilder._vertexShaderParts.functionIds).toEqual([]);
    ShaderBuilderTester.expectHasFragmentFunction(
      shaderBuilder,
      initializeFSFunctionId,
      initializeFSSignature,
      ["    fsInput.positionWC = attributes.positionWC;"]
    );
  });
});
